// ==================== MUSIC + TTS MODULE ====================
// Combined Lavalink Music & TTS with conflict resolution

const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { Connectors } = require('shoukaku');
const { Kazagumo } = require('kazagumo');
const VoiceManager = require('../voice/VoiceManager');
const { TTSBehavior } = require('../voice/VoiceManager');

class MusicModule {
    constructor(client, redis, db) {
        this.client = client;
        this.redis = redis;
        this.db = db;
        this.kazagumo = null;
        this.voiceManager = null;
        this.disconnectTimers = new Map();
        this.BOT_INFO = { name: 'Melodify', version: '2.0.0', color: '#5865F2' };
    }

    async init() {
        // Setup Lavalink
        const Nodes = [{
            name: process.env.LAVALINK_NAME || 'Main',
            url: process.env.LAVALINK_URL || 'lavalinkv4.serenetia.com:443',
            auth: process.env.LAVALINK_AUTH || 'https://dsc.gg/ajidevserver',
            secure: process.env.LAVALINK_SECURE !== 'false'
        }];

        this.kazagumo = new Kazagumo({
            defaultSearchEngine: 'youtube',
            send: (guildId, payload) => {
                const guild = this.client.guilds.cache.get(guildId);
                if (guild) guild.shard.send(payload);
            }
        }, new Connectors.DiscordJS(this.client), Nodes, {
            moveOnDisconnect: false,
            resumable: false,
            reconnectTries: 3,
            restTimeout: 15000
        });

        // Setup Voice Manager
        this.voiceManager = new VoiceManager(this.client, this.kazagumo);

        // Setup Lavalink events
        this.setupLavalinkEvents();

        console.log('✅ Music + TTS Module initialized');
        return this;
    }

    setupLavalinkEvents() {
        this.kazagumo.shoukaku.on('ready', (name) => console.log(`✅ Lavalink ${name} connected!`));
        this.kazagumo.shoukaku.on('error', (name, error) => console.error(`❌ Lavalink ${name} error:`, error.message));
        this.kazagumo.shoukaku.on('close', (name, code, reason) => console.warn(`⚠️ Lavalink ${name} closed: ${code}`));

        this.kazagumo.on('playerStart', async (player, track) => {
            if (this.disconnectTimers.has(player.guildId)) {
                clearTimeout(this.disconnectTimers.get(player.guildId));
                this.disconnectTimers.delete(player.guildId);
            }
            await this.db?.addToHistory?.(player.guildId, track);
            const channel = this.client.channels.cache.get(player.textId);
            if (!channel) return;
            const embed = new EmbedBuilder()
                .setColor(this.BOT_INFO.color)
                .setAuthor({ name: 'Now Playing 🎵', iconURL: this.client.user.displayAvatarURL() })
                .setTitle(track.title)
                .setURL(track.uri)
                .setThumbnail(track.thumbnail || null)
                .addFields(
                    { name: 'Duration', value: this.formatDuration(track.length), inline: true },
                    { name: 'Author', value: track.author || 'Unknown', inline: true },
                    { name: 'Requested by', value: `${track.requester}`, inline: true }
                )
                .setFooter({ text: `Volume: ${player.volume}% • Queue: ${player.queue.length} tracks` });
            channel.send({ embeds: [embed] });
        });

        this.kazagumo.on('playerEmpty', (player) => {
            const channel = this.client.channels.cache.get(player.textId);
            if (channel) {
                channel.send({
                    embeds: [new EmbedBuilder()
                        .setColor('#FFA500')
                        .setDescription('⏸️ Queue finished. Add more songs or use TTS!\n*Leaving in 2 minutes if inactive.*')]
                });
            }
            const timer = setTimeout(() => {
                if (player && !player.queue.current && player.queue.length === 0) {
                    if (channel) {
                        channel.send({
                            embeds: [new EmbedBuilder().setColor('#ff6b6b').setDescription('⏹️ Left due to inactivity.')]
                        });
                    }
                    player.destroy();
                }
                this.disconnectTimers.delete(player.guildId);
            }, 120000);
            this.disconnectTimers.set(player.guildId, timer);
        });
    }

    // ==================== COMMAND HANDLER ====================
    async handleCommand(message, command, args) {
        const commands = {
            // Music Commands
            play: () => this.play(message, args),
            p: () => this.play(message, args),
            skip: () => this.skip(message),
            s: () => this.skip(message),
            stop: () => this.stop(message),
            dc: () => this.stop(message),
            pause: () => this.pause(message),
            resume: () => this.resume(message),
            queue: () => this.queue(message, args),
            q: () => this.queue(message, args),
            np: () => this.nowPlaying(message),
            nowplaying: () => this.nowPlaying(message),
            volume: () => this.volume(message, args),
            vol: () => this.volume(message, args),
            loop: () => this.loop(message, args),
            shuffle: () => this.shuffle(message),
            remove: () => this.remove(message, args),
            clear: () => this.clear(message),
            seek: () => this.seek(message, args),

            // TTS Commands
            tts: () => this.tts(message, args, false),
            'tts!': () => this.tts(message, args, true),
            speak: () => this.tts(message, args, false),
            say: () => this.tts(message, args, false),
            ttsq: () => this.ttsQueue(message, args),
            skiptts: () => this.skipTTS(message),
            stoptts: () => this.skipTTS(message),

            // Voice Mode Commands
            voicemode: () => this.voiceMode(message, args),
            vm: () => this.voiceMode(message, args),
            voicestatus: () => this.voiceStatus(message),
            vs: () => this.voiceStatus(message),

            // Playlist Commands
            save: () => this.savePlaylist(message, args),
            load: () => this.loadPlaylist(message, args),
            playlist: () => this.playlistList(message),
            pl: () => this.playlistList(message),
            deletelist: () => this.deletePlaylist(message, args),

            // Favorites
            fav: () => this.favorite(message),
            favlist: () => this.favoriteList(message),
            unfav: () => this.unfavorite(message, args),
            playfav: () => this.playFavorites(message),

            // History
            history: () => this.history(message),

            // Help
            musichelp: () => this.help(message),
            mhelp: () => this.help(message)
        };

        const handler = commands[command];
        if (handler) {
            try {
                await handler();
            } catch (error) {
                console.error(`Music command error (${command}):`, error);
                message.reply({ embeds: [this.errorEmbed(error.message)] });
            }
        }
    }

    // ==================== MUSIC COMMANDS ====================
    async play(message, args) {
        const query = args.join(' ');
        if (!query) return message.reply({ embeds: [this.errorEmbed('Please provide a song name or URL!')] });

        const { channel } = message.member.voice;
        if (!channel) return message.reply({ embeds: [this.errorEmbed('Join a voice channel first!')] });

        // Check if TTS is playing
        if (this.voiceManager.isTTSPlaying(message.guild.id)) {
            const status = this.voiceManager.getVoiceStatus(message.guild.id);
            if (status.settings.ttsBehavior !== 'disabled') {
                message.reply({ embeds: [this.infoEmbed('⏳ TTS is playing. Song will play after TTS finishes.')] });
            }
        }

        let player = this.kazagumo.players.get(message.guild.id);
        if (!player) {
            player = await this.kazagumo.createPlayer({
                guildId: message.guild.id,
                textId: message.channel.id,
                voiceId: channel.id,
                volume: 70,
                deaf: true
            });
        }

        const searchQuery = this.isURL(query) ? query : `ytsearch:${query}`;
        const result = await this.kazagumo.search(searchQuery, { requester: message.author });

        if (!result || !result.tracks.length) {
            return message.reply({ embeds: [this.errorEmbed('No results found!')] });
        }

        if (result.type === 'PLAYLIST') {
            for (const track of result.tracks) {
                player.queue.add(track);
            }
            message.reply({
                embeds: [this.successEmbed(`📃 Added playlist **${result.playlistName}** (${result.tracks.length} tracks)`)]
            });
        } else {
            const track = result.tracks[0];
            player.queue.add(track);
            if (player.playing) {
                message.reply({
                    embeds: [new EmbedBuilder()
                        .setColor(this.BOT_INFO.color)
                        .setDescription(`📝 Added to queue: **${track.title}**`)
                        .setThumbnail(track.thumbnail)
                        .addFields({ name: 'Position', value: `#${player.queue.length}`, inline: true })]
                });
            }
        }

        if (!player.playing && !player.paused) {
            player.play();
        }
    }

    async skip(message) {
        const player = this.kazagumo.players.get(message.guild.id);
        if (!player || !player.queue.current) {
            return message.reply({ embeds: [this.errorEmbed('Nothing is playing!')] });
        }

        const skipped = player.queue.current.title;
        player.skip();
        message.reply({ embeds: [this.successEmbed(`⏭️ Skipped: **${skipped}**`)] });
    }

    async stop(message) {
        const player = this.kazagumo.players.get(message.guild.id);
        if (!player) return message.reply({ embeds: [this.errorEmbed('Nothing is playing!')] });

        // Also stop TTS if playing
        this.voiceManager.skipTTS(message.guild.id);
        this.voiceManager.cleanup(message.guild.id);

        player.destroy();
        message.reply({ embeds: [this.successEmbed('⏹️ Stopped and disconnected!')] });
    }

    async pause(message) {
        const player = this.kazagumo.players.get(message.guild.id);
        if (!player || !player.playing) {
            return message.reply({ embeds: [this.errorEmbed('Nothing is playing!')] });
        }
        player.pause(true);
        message.reply({ embeds: [this.successEmbed('⏸️ Paused!')] });
    }

    async resume(message) {
        const player = this.kazagumo.players.get(message.guild.id);
        if (!player) return message.reply({ embeds: [this.errorEmbed('Nothing to resume!')] });
        if (!player.paused) return message.reply({ embeds: [this.errorEmbed('Not paused!')] });
        player.pause(false);
        message.reply({ embeds: [this.successEmbed('▶️ Resumed!')] });
    }

    async queue(message, args) {
        const player = this.kazagumo.players.get(message.guild.id);
        if (!player || !player.queue.current) {
            return message.reply({ embeds: [this.errorEmbed('Queue is empty!')] });
        }

        const page = parseInt(args[0]) || 1;
        const itemsPerPage = 10;
        const queue = player.queue;
        const totalPages = Math.ceil(queue.length / itemsPerPage) || 1;
        const start = (page - 1) * itemsPerPage;

        let description = `**Now Playing:**\n🎵 [${queue.current.title}](${queue.current.uri}) - \`${this.formatDuration(queue.current.length)}\`\n\n`;

        if (queue.length > 0) {
            description += '**Up Next:**\n';
            const tracks = queue.slice(start, start + itemsPerPage);
            tracks.forEach((track, i) => {
                description += `\`${start + i + 1}.\` [${track.title}](${track.uri}) - \`${this.formatDuration(track.length)}\`\n`;
            });
        } else {
            description += '*No more songs in queue*';
        }

        const embed = new EmbedBuilder()
            .setColor(this.BOT_INFO.color)
            .setTitle(`📜 Queue - ${message.guild.name}`)
            .setDescription(description)
            .setFooter({ text: `Page ${page}/${totalPages} • ${queue.length} tracks • Volume: ${player.volume}%` });

        message.reply({ embeds: [embed] });
    }

    async nowPlaying(message) {
        const player = this.kazagumo.players.get(message.guild.id);
        if (!player || !player.queue.current) {
            return message.reply({ embeds: [this.errorEmbed('Nothing is playing!')] });
        }

        const track = player.queue.current;
        const position = player.position;
        const duration = track.length;
        const progress = this.createProgressBar(position, duration);

        const embed = new EmbedBuilder()
            .setColor(this.BOT_INFO.color)
            .setTitle('🎵 Now Playing')
            .setDescription(`**[${track.title}](${track.uri})**`)
            .setThumbnail(track.thumbnail)
            .addFields(
                { name: 'Progress', value: `${progress}\n\`${this.formatDuration(position)} / ${this.formatDuration(duration)}\`` },
                { name: 'Author', value: track.author || 'Unknown', inline: true },
                { name: 'Volume', value: `${player.volume}%`, inline: true },
                { name: 'Loop', value: player.loop || 'Off', inline: true }
            )
            .setFooter({ text: `Requested by ${track.requester?.tag || 'Unknown'}` });

        message.reply({ embeds: [embed] });
    }

    async volume(message, args) {
        const player = this.kazagumo.players.get(message.guild.id);
        if (!player) return message.reply({ embeds: [this.errorEmbed('Nothing is playing!')] });

        const vol = parseInt(args[0]);
        if (isNaN(vol) || vol < 0 || vol > 150) {
            return message.reply({ embeds: [this.errorEmbed('Volume must be 0-150!')] });
        }

        player.setVolume(vol);
        message.reply({ embeds: [this.successEmbed(`🔊 Volume set to **${vol}%**`)] });
    }

    async loop(message, args) {
        const player = this.kazagumo.players.get(message.guild.id);
        if (!player) return message.reply({ embeds: [this.errorEmbed('Nothing is playing!')] });

        const mode = args[0]?.toLowerCase();
        const modes = { off: 'none', none: 'none', track: 'track', song: 'track', queue: 'queue', all: 'queue' };

        if (!mode) {
            const current = player.loop || 'none';
            const next = current === 'none' ? 'track' : current === 'track' ? 'queue' : 'none';
            player.setLoop(next);
            message.reply({ embeds: [this.successEmbed(`🔁 Loop: **${next}**`)] });
        } else if (modes[mode]) {
            player.setLoop(modes[mode]);
            message.reply({ embeds: [this.successEmbed(`🔁 Loop: **${modes[mode]}**`)] });
        } else {
            message.reply({ embeds: [this.errorEmbed('Use: `off`, `track`, or `queue`')] });
        }
    }

    async shuffle(message) {
        const player = this.kazagumo.players.get(message.guild.id);
        if (!player || player.queue.length < 2) {
            return message.reply({ embeds: [this.errorEmbed('Need at least 2 songs to shuffle!')] });
        }
        player.queue.shuffle();
        message.reply({ embeds: [this.successEmbed(`🔀 Shuffled ${player.queue.length} tracks!`)] });
    }

    async remove(message, args) {
        const player = this.kazagumo.players.get(message.guild.id);
        if (!player || player.queue.length === 0) {
            return message.reply({ embeds: [this.errorEmbed('Queue is empty!')] });
        }

        const index = parseInt(args[0]) - 1;
        if (isNaN(index) || index < 0 || index >= player.queue.length) {
            return message.reply({ embeds: [this.errorEmbed(`Invalid position! Use 1-${player.queue.length}`)] });
        }

        const removed = player.queue.splice(index, 1)[0];
        message.reply({ embeds: [this.successEmbed(`🗑️ Removed: **${removed.title}**`)] });
    }

    async clear(message) {
        const player = this.kazagumo.players.get(message.guild.id);
        if (!player) return message.reply({ embeds: [this.errorEmbed('Nothing is playing!')] });

        const count = player.queue.length;
        player.queue.clear();
        message.reply({ embeds: [this.successEmbed(`🗑️ Cleared ${count} tracks from queue!`)] });
    }

    async seek(message, args) {
        const player = this.kazagumo.players.get(message.guild.id);
        if (!player || !player.queue.current) {
            return message.reply({ embeds: [this.errorEmbed('Nothing is playing!')] });
        }

        const time = this.parseTime(args[0]);
        if (time === null) {
            return message.reply({ embeds: [this.errorEmbed('Invalid time! Use: `1:30` or `90`')] });
        }

        if (time > player.queue.current.length) {
            return message.reply({ embeds: [this.errorEmbed('Time exceeds song duration!')] });
        }

        player.seek(time);
        message.reply({ embeds: [this.successEmbed(`⏩ Seeked to \`${this.formatDuration(time)}\``)] });
    }

    // ==================== TTS COMMANDS ====================
    async tts(message, args, force = false) {
        const text = args.join(' ');
        if (!text) return message.reply({ embeds: [this.errorEmbed('Please provide text!\nUsage: `!tts <text>`')] });

        const { channel } = message.member.voice;
        if (!channel) return message.reply({ embeds: [this.errorEmbed('Join a voice channel first!')] });

        const isOwner = message.author.id === process.env.OWNER_ID;

        // Check if TTS is allowed
        if (!this.voiceManager.canPlayTTS(message.guild.id, isOwner)) {
            return message.reply({ embeds: [this.errorEmbed('TTS disabled during music. Use `!voicemode tts interrupt`')] });
        }

        await message.react('🔊');

        const result = await this.voiceManager.playTTS(
            message.guild.id,
            message.channel.id,
            channel.id,
            text,
            { userId: message.author.id, isOwner, force }
        );

        if (!result.success) {
            await message.reactions.removeAll().catch(() => {});
            return message.reply({ embeds: [this.errorEmbed(result.error)] });
        }

        if (result.queued) {
            message.reply({
                embeds: [this.infoEmbed(`📝 TTS queued (position: ${result.position}). Will play after current song.`)]
            });
        } else if (result.interrupted) {
            // Music was paused for TTS - no need to notify, it auto-resumes
        }
    }

    async ttsQueue(message, args) {
        const text = args.join(' ');
        if (!text) return message.reply({ embeds: [this.errorEmbed('Please provide text!')] });

        const { channel } = message.member.voice;
        if (!channel) return message.reply({ embeds: [this.errorEmbed('Join a voice channel first!')] });

        const guildState = this.voiceManager.getState(message.guild.id);
        guildState.ttsQueue.push({
            text,
            userId: message.author.id,
            channelId: message.channel.id
        });

        message.reply({
            embeds: [this.successEmbed(`📝 TTS added to queue (position: ${guildState.ttsQueue.length})`)]
        });
    }

    async skipTTS(message) {
        const skipped = await this.voiceManager.skipTTS(message.guild.id);
        if (skipped) {
            message.reply({ embeds: [this.successEmbed('⏭️ TTS skipped!')] });
        } else {
            message.reply({ embeds: [this.errorEmbed('No TTS is playing!')] });
        }
    }

    // ==================== VOICE MODE COMMANDS ====================
    async voiceMode(message, args) {
        const subcommand = args[0]?.toLowerCase();
        const value = args[1]?.toLowerCase();

        if (!subcommand) {
            const settings = this.voiceManager.getSettings(message.guild.id);
            const embed = new EmbedBuilder()
                .setColor(this.BOT_INFO.color)
                .setTitle('🎛️ Voice Mode Settings')
                .addFields(
                    { name: 'TTS Behavior', value: `\`${settings.ttsBehavior}\``, inline: true },
                    { name: 'Auto Resume', value: settings.autoResumeMusic ? '✅' : '❌', inline: true },
                    { name: 'Owner Priority', value: settings.ownerTTSPriority ? '✅' : '❌', inline: true },
                    { name: 'TTS Cooldown', value: `${settings.ttsInterruptCooldown / 1000}s`, inline: true },
                    { name: 'Max TTS Length', value: `${settings.maxTTSLength} chars`, inline: true }
                )
                .setDescription('**TTS Behaviors:**\n`interrupt` - Pause music, play TTS, resume\n`queue` - Play TTS after current song\n`skip` - Skip song, play TTS\n`disabled` - No TTS during music\n\n**Usage:**\n`!voicemode tts <behavior>`');
            return message.reply({ embeds: [embed] });
        }

        if (subcommand === 'tts') {
            const behaviors = ['interrupt', 'queue', 'skip', 'disabled'];
            if (!behaviors.includes(value)) {
                return message.reply({ embeds: [this.errorEmbed(`Invalid! Use: ${behaviors.join(', ')}`)] });
            }
            await this.voiceManager.updateSettings(message.guild.id, 'ttsBehavior', value);
            message.reply({ embeds: [this.successEmbed(`✅ TTS behavior set to: **${value}**`)] });
        } else if (subcommand === 'autoresume') {
            const enabled = value === 'on' || value === 'true' || value === 'yes';
            await this.voiceManager.updateSettings(message.guild.id, 'autoResumeMusic', enabled);
            message.reply({ embeds: [this.successEmbed(`✅ Auto-resume: **${enabled ? 'ON' : 'OFF'}**`)] });
        } else if (subcommand === 'cooldown') {
            const seconds = parseInt(value);
            if (isNaN(seconds) || seconds < 0 || seconds > 60) {
                return message.reply({ embeds: [this.errorEmbed('Cooldown must be 0-60 seconds!')] });
            }
            await this.voiceManager.updateSettings(message.guild.id, 'ttsInterruptCooldown', seconds * 1000);
            message.reply({ embeds: [this.successEmbed(`✅ TTS cooldown: **${seconds}s**`)] });
        } else {
            message.reply({ embeds: [this.errorEmbed('Unknown setting! Use: `tts`, `autoresume`, `cooldown`')] });
        }
    }

    async voiceStatus(message) {
        const status = this.voiceManager.getVoiceStatus(message.guild.id);

        const stateEmojis = {
            IDLE: '⚫',
            MUSIC: '🎵',
            TTS_ONLY: '🔊',
            TTS_INTERRUPT: '🔊🎵'
        };

        const embed = new EmbedBuilder()
            .setColor(this.BOT_INFO.color)
            .setTitle('🎛️ Voice Status')
            .addFields(
                { name: 'State', value: `${stateEmojis[status.state]} ${status.state}`, inline: true },
                { name: 'Music', value: status.music.playing ? `▶️ ${status.music.current}` : '⏹️ Stopped', inline: true },
                { name: 'TTS', value: status.tts.playing ? '🔊 Playing' : '⏹️ Idle', inline: true },
                { name: 'Music Queue', value: `${status.music.queueLength} tracks`, inline: true },
                { name: 'TTS Queue', value: `${status.tts.queueLength} items`, inline: true },
                { name: 'TTS Cooldown', value: status.tts.cooldownRemaining > 0 ? `${Math.ceil(status.tts.cooldownRemaining / 1000)}s` : 'Ready', inline: true }
            );

        message.reply({ embeds: [embed] });
    }

    // ==================== PLAYLIST COMMANDS ====================
    async savePlaylist(message, args) {
        const name = args[0];
        if (!name) return message.reply({ embeds: [this.errorEmbed('Please provide playlist name!')] });

        const player = this.kazagumo.players.get(message.guild.id);
        if (!player || !player.queue.current) {
            return message.reply({ embeds: [this.errorEmbed('Nothing is playing!')] });
        }

        const tracks = [player.queue.current, ...player.queue];
        const success = await this.db?.savePlaylist?.(message.author.id, name, tracks);

        if (success) {
            message.reply({ embeds: [this.successEmbed(`💾 Saved playlist **${name}** (${tracks.length} tracks)`)] });
        } else {
            message.reply({ embeds: [this.errorEmbed('Failed to save playlist!')] });
        }
    }

    async loadPlaylist(message, args) {
        const name = args[0];
        if (!name) return message.reply({ embeds: [this.errorEmbed('Please provide playlist name!')] });

        const playlists = await this.db?.getUserPlaylists?.(message.author.id) || {};
        const playlist = playlists[name];

        if (!playlist) {
            return message.reply({ embeds: [this.errorEmbed(`Playlist **${name}** not found!`)] });
        }

        const { channel } = message.member.voice;
        if (!channel) return message.reply({ embeds: [this.errorEmbed('Join a voice channel first!')] });

        let player = this.kazagumo.players.get(message.guild.id);
        if (!player) {
            player = await this.kazagumo.createPlayer({
                guildId: message.guild.id,
                textId: message.channel.id,
                voiceId: channel.id,
                volume: 70,
                deaf: true
            });
        }

        let added = 0;
        for (const trackData of playlist.tracks) {
            try {
                const result = await this.kazagumo.search(trackData.uri, { requester: message.author });
                if (result?.tracks?.[0]) {
                    player.queue.add(result.tracks[0]);
                    added++;
                }
            } catch (e) { }
        }

        message.reply({ embeds: [this.successEmbed(`📃 Loaded **${name}** (${added}/${playlist.tracks.length} tracks)`)] });

        if (!player.playing && !player.paused) {
            player.play();
        }
    }

    async playlistList(message) {
        const playlists = await this.db?.getUserPlaylists?.(message.author.id) || {};
        const names = Object.keys(playlists);

        if (names.length === 0) {
            return message.reply({ embeds: [this.infoEmbed('No playlists saved. Use `!save <name>` to create one!')] });
        }

        let description = '';
        names.forEach((name, i) => {
            const pl = playlists[name];
            description += `\`${i + 1}.\` **${name}** - ${pl.trackCount} tracks\n`;
        });

        const embed = new EmbedBuilder()
            .setColor(this.BOT_INFO.color)
            .setTitle('📃 Your Playlists')
            .setDescription(description)
            .setFooter({ text: 'Use !load <name> to play a playlist' });

        message.reply({ embeds: [embed] });
    }

    async deletePlaylist(message, args) {
        const name = args[0];
        if (!name) return message.reply({ embeds: [this.errorEmbed('Please provide playlist name!')] });

        const success = await this.db?.deletePlaylist?.(message.author.id, name);
        if (success) {
            message.reply({ embeds: [this.successEmbed(`🗑️ Deleted playlist **${name}**`)] });
        } else {
            message.reply({ embeds: [this.errorEmbed(`Playlist **${name}** not found!`)] });
        }
    }

    // ==================== FAVORITES ====================
    async favorite(message) {
        const player = this.kazagumo.players.get(message.guild.id);
        if (!player || !player.queue.current) {
            return message.reply({ embeds: [this.errorEmbed('Nothing is playing!')] });
        }

        const track = player.queue.current;
        const success = await this.db?.addFavorite?.(message.author.id, track);

        if (success) {
            message.reply({ embeds: [this.successEmbed(`❤️ Added **${track.title}** to favorites!`)] });
        } else {
            message.reply({ embeds: [this.infoEmbed('Already in favorites!')] });
        }
    }

    async favoriteList(message) {
        const favorites = await this.db?.getFavorites?.(message.author.id) || [];

        if (favorites.length === 0) {
            return message.reply({ embeds: [this.infoEmbed('No favorites yet! Use `!fav` to add current song.')] });
        }

        let description = '';
        favorites.slice(0, 15).forEach((track, i) => {
            description += `\`${i + 1}.\` [${track.title}](${track.uri})\n`;
        });

        if (favorites.length > 15) {
            description += `\n*...and ${favorites.length - 15} more*`;
        }

        const embed = new EmbedBuilder()
            .setColor(this.BOT_INFO.color)
            .setTitle('❤️ Your Favorites')
            .setDescription(description)
            .setFooter({ text: `${favorites.length} tracks • Use !playfav to play all` });

        message.reply({ embeds: [embed] });
    }

    async unfavorite(message, args) {
        const index = parseInt(args[0]) - 1;
        if (isNaN(index)) {
            return message.reply({ embeds: [this.errorEmbed('Please provide track number! Use `!favlist` to see list.')] });
        }

        const success = await this.db?.removeFavorite?.(message.author.id, index);
        if (success) {
            message.reply({ embeds: [this.successEmbed('💔 Removed from favorites!')] });
        } else {
            message.reply({ embeds: [this.errorEmbed('Invalid track number!')] });
        }
    }

    async playFavorites(message) {
        const favorites = await this.db?.getFavorites?.(message.author.id) || [];

        if (favorites.length === 0) {
            return message.reply({ embeds: [this.errorEmbed('No favorites to play!')] });
        }

        const { channel } = message.member.voice;
        if (!channel) return message.reply({ embeds: [this.errorEmbed('Join a voice channel first!')] });

        let player = this.kazagumo.players.get(message.guild.id);
        if (!player) {
            player = await this.kazagumo.createPlayer({
                guildId: message.guild.id,
                textId: message.channel.id,
                voiceId: channel.id,
                volume: 70,
                deaf: true
            });
        }

        let added = 0;
        for (const trackData of favorites) {
            try {
                const result = await this.kazagumo.search(trackData.uri, { requester: message.author });
                if (result?.tracks?.[0]) {
                    player.queue.add(result.tracks[0]);
                    added++;
                }
            } catch (e) { }
        }

        message.reply({ embeds: [this.successEmbed(`❤️ Playing favorites (${added}/${favorites.length} tracks)`)] });

        if (!player.playing && !player.paused) {
            player.play();
        }
    }

    // ==================== HISTORY ====================
    async history(message) {
        const history = await this.db?.getHistory?.(message.guild.id, 15) || [];

        if (history.length === 0) {
            return message.reply({ embeds: [this.infoEmbed('No play history yet!')] });
        }

        let description = '';
        history.forEach((track, i) => {
            const time = new Date(track.playedAt).toLocaleTimeString();
            description += `\`${i + 1}.\` ${track.title}\n   *${time} by ${track.requestedBy}*\n`;
        });

        const embed = new EmbedBuilder()
            .setColor(this.BOT_INFO.color)
            .setTitle('📜 Recent History')
            .setDescription(description);

        message.reply({ embeds: [embed] });
    }

    // ==================== HELP ====================
    help(message) {
        const embed = new EmbedBuilder()
            .setColor(this.BOT_INFO.color)
            .setTitle('🎵 Music + TTS Commands')
            .addFields(
                {
                    name: '🎵 Music',
                    value: '`!play <song>` - Play music\n`!skip` - Skip song\n`!stop` - Stop & leave\n`!pause/resume` - Pause/Resume\n`!queue` - View queue\n`!np` - Now playing\n`!volume <0-150>` - Set volume\n`!loop <off/track/queue>` - Loop mode\n`!shuffle` - Shuffle queue\n`!seek <time>` - Seek to time'
                },
                {
                    name: '🔊 TTS',
                    value: '`!tts <text>` - Text to speech\n`!tts! <text>` - Force TTS (owner)\n`!ttsq <text>` - Queue TTS\n`!skiptts` - Skip current TTS'
                },
                {
                    name: '🎛️ Voice Mode',
                    value: '`!voicemode` - View settings\n`!voicemode tts <mode>` - Set TTS behavior\n  • `interrupt` - Pause music for TTS\n  • `queue` - TTS after song\n  • `disabled` - No TTS during music\n`!voicestatus` - Current voice status'
                },
                {
                    name: '📃 Playlists & Favorites',
                    value: '`!save <name>` - Save queue\n`!load <name>` - Load playlist\n`!playlist` - List playlists\n`!fav` - Add to favorites\n`!favlist` - View favorites\n`!playfav` - Play favorites'
                }
            )
            .setFooter({ text: 'TTS uses ElevenLabs for owner, Google TTS for others' });

        message.reply({ embeds: [embed] });
    }

    // ==================== UTILITIES ====================
    formatDuration(ms) {
        if (!ms || ms === 0) return '🔴 Live';
        const s = Math.floor((ms / 1000) % 60);
        const m = Math.floor((ms / (1000 * 60)) % 60);
        const h = Math.floor(ms / (1000 * 60 * 60));
        return h > 0 ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}` : `${m}:${s.toString().padStart(2, '0')}`;
    }

    parseTime(str) {
        if (!str) return null;
        if (str.includes(':')) {
            const parts = str.split(':').map(Number);
            if (parts.length === 2) return (parts[0] * 60 + parts[1]) * 1000;
            if (parts.length === 3) return (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000;
        }
        const num = parseInt(str);
        return isNaN(num) ? null : num * 1000;
    }

    createProgressBar(current, total, length = 15) {
        const progress = Math.round((current / total) * length);
        const empty = length - progress;
        return '▬'.repeat(progress) + '🔘' + '▬'.repeat(empty);
    }

    isURL(string) {
        return /^https?:\/\//i.test(string);
    }

    errorEmbed(msg) {
        return new EmbedBuilder().setColor('#ff6b6b').setDescription(`❌ ${msg}`);
    }

    successEmbed(msg) {
        return new EmbedBuilder().setColor(this.BOT_INFO.color).setDescription(msg);
    }

    infoEmbed(msg) {
        return new EmbedBuilder().setColor('#FFA500').setDescription(msg);
    }
}

module.exports = MusicModule;
