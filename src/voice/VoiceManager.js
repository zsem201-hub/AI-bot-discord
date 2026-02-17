// ==================== VOICE MANAGER (SIMPLIFIED) ====================
// Simple queue system: Music OR TTS, whoever comes first
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus, entersState, getVoiceConnection } = require('@discordjs/voice');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const VoiceState = { IDLE: 'IDLE', MUSIC: 'MUSIC', TTS: 'TTS' };

class VoiceManager {
    constructor(client, kazagumo) {
        this.client = client;
        this.kazagumo = kazagumo;
        this.states = new Map();
        this.ttsPlayers = new Map();
        this.ttsQueue = new Map();
        this.tempDir = path.join(__dirname, '../../data/temp/tts');
        if (!fs.existsSync(this.tempDir)) fs.mkdirSync(this.tempDir, { recursive: true });
        this.setupEvents();
    }

    getState(guildId) {
        if (!this.states.has(guildId)) {
            this.states.set(guildId, { state: VoiceState.IDLE, lastActivity: Date.now() });
        }
        return this.states.get(guildId);
    }

    setState(guildId, state) {
        const s = this.getState(guildId);
        s.state = state;
        s.lastActivity = Date.now();
    }

    setupEvents() {
        this.kazagumo.on('playerStart', (player) => {
            this.setState(player.guildId, VoiceState.MUSIC);
        });
        this.kazagumo.on('playerEmpty', (player) => {
            this.setState(player.guildId, VoiceState.IDLE);
            this.processQueue(player.guildId);
        });
        this.kazagumo.on('playerDestroy', (player) => {
            this.setState(player.guildId, VoiceState.IDLE);
            this.cleanup(player.guildId);
        });
    }

    // Check if can play
    canPlayMusic(guildId) {
        const s = this.getState(guildId);
        return s.state === VoiceState.IDLE || s.state === VoiceState.MUSIC;
    }

    canPlayTTS(guildId) {
        const s = this.getState(guildId);
        return s.state === VoiceState.IDLE;
    }

    isBusy(guildId) {
        const s = this.getState(guildId);
        return s.state !== VoiceState.IDLE;
    }

    // TTS Methods
    async playTTS(guildId, channelId, voiceChannelId, text, userId, isOwner = false) {
        const s = this.getState(guildId);
        
        // If music playing, queue TTS
        if (s.state === VoiceState.MUSIC) {
            if (!this.ttsQueue.has(guildId)) this.ttsQueue.set(guildId, []);
            this.ttsQueue.get(guildId).push({ text, channelId, voiceChannelId, userId, isOwner });
            return { success: true, queued: true, position: this.ttsQueue.get(guildId).length };
        }

        // If another TTS playing, queue
        if (s.state === VoiceState.TTS) {
            if (!this.ttsQueue.has(guildId)) this.ttsQueue.set(guildId, []);
            this.ttsQueue.get(guildId).push({ text, channelId, voiceChannelId, userId, isOwner });
            return { success: true, queued: true, position: this.ttsQueue.get(guildId).length };
        }

        // Play immediately
        return await this.executeTTS(guildId, channelId, voiceChannelId, text, userId, isOwner);
    }

    async executeTTS(guildId, channelId, voiceChannelId, text, userId, isOwner) {
        try {
            this.setState(guildId, VoiceState.TTS);
            const audioBuffer = await this.generateTTS(text, isOwner);
            const tempFile = path.join(this.tempDir, `tts_${guildId}_${Date.now()}.mp3`);
            fs.writeFileSync(tempFile, audioBuffer);

            const guild = this.client.guilds.cache.get(guildId);
            if (!guild) throw new Error('Guild not found');

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

            const player = createAudioPlayer();
            const resource = createAudioResource(tempFile);
            connection.subscribe(player);
            player.play(resource);
            this.ttsPlayers.set(guildId, player);

            return new Promise((resolve) => {
                player.on(AudioPlayerStatus.Idle, () => {
                    this.ttsPlayers.delete(guildId);
                    fs.unlink(tempFile, () => {});
                    this.setState(guildId, VoiceState.IDLE);
                    this.processQueue(guildId);
                    resolve({ success: true });
                });
                player.on('error', (err) => {
                    this.ttsPlayers.delete(guildId);
                    fs.unlink(tempFile, () => {});
                    this.setState(guildId, VoiceState.IDLE);
                    resolve({ success: false, error: err.message });
                });
                setTimeout(() => { if (this.ttsPlayers.has(guildId)) player.stop(); }, 60000);
            });
        } catch (error) {
            this.setState(guildId, VoiceState.IDLE);
            return { success: false, error: error.message };
        }
    }

    async generateTTS(text, isOwner) {
        if (isOwner && process.env.ELEVENLABS_API_KEY) {
            const voiceId = process.env.ELEVENLABS_VOICE_ID || 'adam';
            const response = await axios.post(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
                text, model_id: 'eleven_multilingual_v2',
                voice_settings: { stability: 0.5, similarity_boost: 0.75 }
            }, {
                headers: { 'Accept': 'audio/mpeg', 'xi-api-key': process.env.ELEVENLABS_API_KEY },
                responseType: 'arraybuffer', timeout: 15000
            });
            return Buffer.from(response.data);
        }
        const lang = /[\u3040-\u30ff]/.test(text) ? 'ja' : /[\u4e00-\u9fff]/.test(text) ? 'zh' : /[\uac00-\ud7af]/.test(text) ? 'ko' : 'en';
        const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text.substring(0, 200))}&tl=${lang}&client=tw-ob`;
        const response = await axios.get(url, { responseType: 'arraybuffer', headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 10000 });
        return Buffer.from(response.data);
    }

    processQueue(guildId) {
        if (!this.ttsQueue.has(guildId) || this.ttsQueue.get(guildId).length === 0) return;
        const next = this.ttsQueue.get(guildId).shift();
        this.executeTTS(guildId, next.channelId, next.voiceChannelId, next.text, next.userId, next.isOwner);
    }

    skipTTS(guildId) {
        const player = this.ttsPlayers.get(guildId);
        if (player) { player.stop(); return true; }
        return false;
    }

    clearTTSQueue(guildId) {
        this.ttsQueue.set(guildId, []);
    }

    cleanup(guildId) {
        this.states.delete(guildId);
        this.ttsQueue.delete(guildId);
        const p = this.ttsPlayers.get(guildId);
        if (p) { p.stop(); this.ttsPlayers.delete(guildId); }
    }

    getStatus(guildId) {
        const s = this.getState(guildId);
        const player = this.kazagumo.players.get(guildId);
        return {
            state: s.state,
            musicPlaying: player?.playing || false,
            ttsPlaying: this.ttsPlayers.has(guildId),
            ttsQueueLength: this.ttsQueue.get(guildId)?.length || 0,
            musicQueueLength: player?.queue?.length || 0
        };
    }
}

module.exports = VoiceManager;
module.exports.VoiceState = VoiceState;
