// ==================== VOICE MANAGER ====================
// Central controller for Music (Lavalink) + TTS (Discord.js Voice)
// Handles state management & conflict resolution

const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus, entersState, getVoiceConnection } = require('@discordjs/voice');
const { EmbedBuilder } = require('discord.js');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const logger = require('../services/logger');

// Voice States
const VoiceState = {
    IDLE: 'IDLE',
    MUSIC: 'MUSIC',
    TTS_ONLY: 'TTS_ONLY',
    TTS_INTERRUPT: 'TTS_INTERRUPT'
};

// TTS Behaviors
const TTSBehavior = {
    INTERRUPT: 'interrupt',  // Pause music, play TTS, resume
    QUEUE: 'queue',          // Add TTS after current song
    SKIP: 'skip',            // Skip current song, play TTS
    DISABLED: 'disabled'     // No TTS during music
};

class VoiceManager {
    constructor(client, kazagumo) {
        this.client = client;
        this.kazagumo = kazagumo;
        this.guildStates = new Map();
        this.ttsPlayers = new Map();
        this.ttsQueues = new Map();
        this.tempDir = path.join(__dirname, '../../data/temp/tts');
        this.ensureTempDir();
        this.setupKazagumoEvents();
    }

    ensureTempDir() {
        if (!fs.existsSync(this.tempDir)) {
            fs.mkdirSync(this.tempDir, { recursive: true });
        }
    }

    // ==================== STATE MANAGEMENT ====================
    getState(guildId) {
        if (!this.guildStates.has(guildId)) {
            this.guildStates.set(guildId, {
                state: VoiceState.IDLE,
                settings: {
                    ttsBehavior: TTSBehavior.INTERRUPT,
                    autoResumeMusic: true,
                    ttsInterruptCooldown: 3000,
                    maxTTSLength: 5000,
                    ownerTTSPriority: true,
                    announceChanges: false
                },
                musicPaused: false,
                musicPosition: 0,
                lastTTSTime: 0,
                ttsQueue: []
            });
        }
        return this.guildStates.get(guildId);
    }

    setState(guildId, newState) {
        const guildState = this.getState(guildId);
        const oldState = guildState.state;
        guildState.state = newState;
        logger.debug(`[VoiceManager] Guild ${guildId}: ${oldState} → ${newState}`);
        return guildState;
    }

    // ==================== SETTINGS ====================
    async updateSettings(guildId, key, value) {
        const guildState = this.getState(guildId);
        if (guildState.settings.hasOwnProperty(key)) {
            guildState.settings[key] = value;
            return true;
        }
        return false;
    }

    getSettings(guildId) {
        return this.getState(guildId).settings;
    }

    // ==================== LAVALINK EVENTS ====================
    setupKazagumoEvents() {
        this.kazagumo.on('playerStart', (player, track) => {
            const guildState = this.getState(player.guildId);
            if (guildState.state === VoiceState.TTS_INTERRUPT) {
                return;
            }
            this.setState(player.guildId, VoiceState.MUSIC);
        });

        this.kazagumo.on('playerEmpty', (player) => {
            const guildState = this.getState(player.guildId);
            if (guildState.state === VoiceState.MUSIC) {
                if (guildState.ttsQueue.length > 0) {
                    this.processNextTTS(player.guildId, player.textId);
                } else {
                    this.setState(player.guildId, VoiceState.IDLE);
                }
            }
        });

        this.kazagumo.on('playerDestroy', (player) => {
            this.cleanup(player.guildId);
        });
    }

    // ==================== TTS METHODS ====================
    async playTTS(guildId, channelId, voiceChannelId, text, options = {}) {
        const { userId, isOwner = false, force = false } = options;
        const guildState = this.getState(guildId);
        const settings = guildState.settings;
        const player = this.kazagumo.players.get(guildId);
        const now = Date.now();

        // Check cooldown (skip for owner with force)
        if (!force && now - guildState.lastTTSTime < settings.ttsInterruptCooldown) {
            const remaining = Math.ceil((settings.ttsInterruptCooldown - (now - guildState.lastTTSTime)) / 1000);
            return { success: false, error: `TTS cooldown. Wait ${remaining}s` };
        }

        // Check text length
        if (text.length > settings.maxTTSLength) {
            return { success: false, error: `Text too long! Max ${settings.maxTTSLength} characters.` };
        }

        // Determine behavior based on current state
        const currentState = guildState.state;
        const musicPlaying = player && player.queue.current && player.playing;

        // If music is playing, handle based on settings
        if (musicPlaying) {
            const behavior = (force && isOwner) ? TTSBehavior.INTERRUPT : settings.ttsBehavior;

            switch (behavior) {
                case TTSBehavior.DISABLED:
                    return { success: false, error: 'TTS disabled during music. Use `!voicemode tts interrupt` to enable.' };

                case TTSBehavior.QUEUE:
                    guildState.ttsQueue.push({ text, userId, channelId });
                    return { success: true, queued: true, position: guildState.ttsQueue.length };

                case TTSBehavior.SKIP:
                    player.skip();
                    await this.sleep(500);
                    break;

                case TTSBehavior.INTERRUPT:
                default:
                    await this.pauseMusic(guildId);
                    break;
            }
        }

        // Generate and play TTS
        try {
            guildState.lastTTSTime = now;
            const audioBuffer = await this.generateTTS(text, userId, isOwner);
            const result = await this.playTTSAudio(guildId, voiceChannelId, channelId, audioBuffer);

            if (!result.success) {
                if (guildState.musicPaused) {
                    await this.resumeMusic(guildId);
                }
                return result;
            }

            return { success: true, interrupted: guildState.musicPaused };

        } catch (error) {
            logger.error(`[VoiceManager] TTS Error: ${error.message}`);
            if (guildState.musicPaused) {
                await this.resumeMusic(guildId);
            }
            return { success: false, error: error.message };
        }
    }

    async generateTTS(text, userId, isOwner) {
        // Use ElevenLabs for owner, Google TTS for others
        if (isOwner && process.env.ELEVENLABS_API_KEY) {
            return await this.elevenLabsTTS(text);
        }
        return await this.googleTTS(text);
    }

    async elevenLabsTTS(text) {
        const voiceId = process.env.ELEVENLABS_VOICE_ID || 'adam';
        const response = await axios.post(
            `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
            {
                text,
                model_id: 'eleven_multilingual_v2',
                voice_settings: { stability: 0.5, similarity_boost: 0.75 }
            },
            {
                headers: {
                    'Accept': 'audio/mpeg',
                    'Content-Type': 'application/json',
                    'xi-api-key': process.env.ELEVENLABS_API_KEY
                },
                responseType: 'arraybuffer',
                timeout: 15000
            }
        );
        return Buffer.from(response.data);
    }

    async googleTTS(text) {
        const lang = this.detectLanguage(text);
        const encodedText = encodeURIComponent(text.substring(0, 200));
        const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodedText}&tl=${lang}&client=tw-ob`;
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 10000
        });
        return Buffer.from(response.data);
    }

    detectLanguage(text) {
        if (/[\u3040-\u309f\u30a0-\u30ff]/.test(text)) return 'ja';
        if (/[\u4e00-\u9fff]/.test(text)) return 'zh';
        if (/[\uac00-\ud7af]/.test(text)) return 'ko';
        if (/[ก-๙]/.test(text)) return 'th';
        if (/[а-яА-Я]/.test(text)) return 'ru';
        if (/[أ-ي]/.test(text)) return 'ar';
        return 'en';
    }

    async playTTSAudio(guildId, voiceChannelId, textChannelId, audioBuffer) {
        const guild = this.client.guilds.cache.get(guildId);
        if (!guild) return { success: false, error: 'Guild not found' };

        const voiceChannel = guild.channels.cache.get(voiceChannelId);
        if (!voiceChannel) return { success: false, error: 'Voice channel not found' };

        try {
            // Save buffer to temp file
            const tempFile = path.join(this.tempDir, `tts_${guildId}_${Date.now()}.mp3`);
            fs.writeFileSync(tempFile, audioBuffer);

            // Get or create voice connection
            let connection = getVoiceConnection(guildId);
            
            if (!connection) {
                connection = joinVoiceChannel({
                    channelId: voiceChannelId,
                    guildId: guildId,
                    adapterCreator: guild.voiceAdapterCreator,
                    selfDeaf: true
                });
                await entersState(connection, VoiceConnectionStatus.Ready, 10000);
            }

            // Create audio player
            const player = createAudioPlayer();
            const resource = createAudioResource(tempFile);

            // Set state
            const guildState = this.getState(guildId);
            const previousState = guildState.state;
            if (guildState.musicPaused) {
                this.setState(guildId, VoiceState.TTS_INTERRUPT);
            } else {
                this.setState(guildId, VoiceState.TTS_ONLY);
            }

            // Subscribe connection to player
            connection.subscribe(player);
            player.play(resource);

            this.ttsPlayers.set(guildId, player);

            // Wait for TTS to finish
            return new Promise((resolve) => {
                player.on(AudioPlayerStatus.Idle, async () => {
                    // Cleanup
                    this.ttsPlayers.delete(guildId);
                    fs.unlink(tempFile, () => {});

                    // Process TTS queue or resume music
                    if (guildState.ttsQueue.length > 0) {
                        this.processNextTTS(guildId, textChannelId);
                    } else if (guildState.musicPaused) {
                        await this.resumeMusic(guildId);
                    } else {
                        this.setState(guildId, VoiceState.IDLE);
                    }

                    resolve({ success: true });
                });

                player.on('error', (error) => {
                    logger.error(`[VoiceManager] TTS Player Error: ${error.message}`);
                    this.ttsPlayers.delete(guildId);
                    fs.unlink(tempFile, () => {});
                    
                    if (guildState.musicPaused) {
                        this.resumeMusic(guildId);
                    }
                    
                    resolve({ success: false, error: error.message });
                });

                // Timeout safety
                setTimeout(() => {
                    if (this.ttsPlayers.has(guildId)) {
                        player.stop();
                    }
                }, 60000);
            });

        } catch (error) {
            logger.error(`[VoiceManager] Play TTS Error: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    async processNextTTS(guildId, textChannelId) {
        const guildState = this.getState(guildId);
        if (guildState.ttsQueue.length === 0) return;

        const nextTTS = guildState.ttsQueue.shift();
        const player = this.kazagumo.players.get(guildId);
        const voiceChannelId = player?.voiceId;

        if (voiceChannelId) {
            await this.playTTS(guildId, textChannelId, voiceChannelId, nextTTS.text, {
                userId: nextTTS.userId,
                isOwner: nextTTS.userId === process.env.OWNER_ID
            });
        }
    }

    // ==================== MUSIC CONTROL ====================
    async pauseMusic(guildId) {
        const player = this.kazagumo.players.get(guildId);
        if (!player || !player.playing) return false;

        const guildState = this.getState(guildId);
        guildState.musicPaused = true;
        guildState.musicPosition = player.position;

        player.pause(true);
        logger.debug(`[VoiceManager] Music paused for TTS in guild ${guildId}`);
        return true;
    }

    async resumeMusic(guildId) {
        const player = this.kazagumo.players.get(guildId);
        const guildState = this.getState(guildId);

        if (!player || !guildState.musicPaused) return false;

        guildState.musicPaused = false;

        // Reconnect Lavalink to voice
        if (player.paused) {
            player.pause(false);
        }

        this.setState(guildId, VoiceState.MUSIC);
        logger.debug(`[VoiceManager] Music resumed after TTS in guild ${guildId}`);
        return true;
    }

    // ==================== SKIP TTS ====================
    async skipTTS(guildId) {
        const player = this.ttsPlayers.get(guildId);
        if (player) {
            player.stop();
            return true;
        }
        return false;
    }

    // ==================== UTILITY ====================
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    cleanup(guildId) {
        const guildState = this.getState(guildId);
        guildState.state = VoiceState.IDLE;
        guildState.musicPaused = false;
        guildState.ttsQueue = [];

        const ttsPlayer = this.ttsPlayers.get(guildId);
        if (ttsPlayer) {
            ttsPlayer.stop();
            this.ttsPlayers.delete(guildId);
        }

        // Cleanup temp files
        const files = fs.readdirSync(this.tempDir);
        files.forEach(file => {
            if (file.startsWith(`tts_${guildId}_`)) {
                fs.unlink(path.join(this.tempDir, file), () => {});
            }
        });
    }

    // ==================== STATUS ====================
    getVoiceStatus(guildId) {
        const guildState = this.getState(guildId);
        const player = this.kazagumo.players.get(guildId);
        const ttsPlaying = this.ttsPlayers.has(guildId);

        return {
            state: guildState.state,
            settings: guildState.settings,
            music: {
                playing: player?.playing || false,
                paused: player?.paused || false,
                current: player?.queue?.current?.title || null,
                queueLength: player?.queue?.length || 0
            },
            tts: {
                playing: ttsPlaying,
                queueLength: guildState.ttsQueue.length,
                cooldownRemaining: Math.max(0, guildState.settings.ttsInterruptCooldown - (Date.now() - guildState.lastTTSTime))
            }
        };
    }

    // ==================== CHECK METHODS ====================
    isMusicPlaying(guildId) {
        const player = this.kazagumo.players.get(guildId);
        return player && player.playing && !player.paused;
    }

    isTTSPlaying(guildId) {
        return this.ttsPlayers.has(guildId);
    }

    canPlayTTS(guildId, isOwner = false) {
        const guildState = this.getState(guildId);
        const settings = guildState.settings;

        if (isOwner && settings.ownerTTSPriority) return true;
        if (settings.ttsBehavior === TTSBehavior.DISABLED && this.isMusicPlaying(guildId)) return false;

        return true;
    }
}

module.exports = VoiceManager;
module.exports.VoiceState = VoiceState;
module.exports.TTSBehavior = TTSBehavior;
