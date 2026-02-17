// ==================== SIMPLIFIED MUSIC MODULE ====================
const { EmbedBuilder } = require('discord.js');

class MusicModule {
    constructor(client, kazagumo, voiceManager, db) {
        this.client = client;
        this.kazagumo = kazagumo;
        this.voiceManager = voiceManager;
        this.db = db;
        this.disconnectTimers = new Map();
        this.setupEvents();
    }

    setupEvents() {
        this.kazagumo.on('playerStart', async (player, track) => {
            if (this.disconnectTimers.has(player.guildId)) {
                clearTimeout(this.disconnectTimers.get(player.guildId));
                this.disconnectTimers.delete(player.guildId);
            }
            const ch = this.client.channels.cache.get(player.textId);
            if (ch) ch.send(`🎵 Now playing: **${track.title}** [${this.formatDuration(track.length)}]`);
        });

        this.kazagumo.on('playerEmpty', (player) => {
            const ch = this.client.channels.cache.get(player.textId);
            if (ch) ch.send('⏸️ Queue finished. Leaving in 2 minutes if no songs added.');
            
            const timer = setTimeout(() => {
                if (player && !player.queue.current && !player.queue.length) {
                    if (ch) ch.send('⏹️ Left due to inactivity.');
                    player.destroy();
                }
            }, 120000);
            this.disconnectTimers.set(player.guildId, timer);
        });
    }

    async handleCommand(msg, cmd, args) {
        const handlers = {
            play: () => this.play(msg, args),
            skip: () => this.skip(msg),
            stop: () => this.stop(msg),
            pause: () => this.pause(msg),
            resume: () => this.resume(msg),
            queue: () => this.queue(msg, args),
            nowplaying: () => this.nowPlaying(msg),
            volume: () => this.volume(msg, args),
            loop: () => this.loop(msg, args),
            shuffle: () => this.shuffle(msg),
            seek: () => this.seek(msg, args),
            remove: () => this.remove(msg, args),
            clear: () => this.clear(msg)
        };
        if (handlers[cmd]) await handlers[cmd]();
    }

    async play(msg, args) {
        const query = args.join(' ');
        if (!query) return msg.reply('Tulis nama lagu! Contoh: !p bohemian rhapsody');

        const vc = msg.member.voice.channel;
        if (!vc) return msg.reply('Join voice channel dulu!');

        // Check if TTS is playing
        const status = this.voiceManager?.getStatus(msg.guild.id);
        if (status?.state === 'TTS') {
            return msg.reply('⏳ TTS sedang jalan. Tunggu selesai atau skip dengan !st');
        }

        let player = this.kazagumo.players.get(msg.guild.id);
        if (!player) {
            player = await this.kazagumo.createPlayer({
                guildId: msg.guild.id,
                textId: msg.channel.id,
                voiceId: vc.id,
                volume: 70,
                deaf: true
            });
        }

        const searchQuery = this.isURL(query) ? query : `ytsearch:${query}`;
        const result = await this.kazagumo.search(searchQuery, { requester: msg.author });

        if (!result?.tracks?.length) return msg.reply('Tidak ditemukan!');

        if (result.type === 'PLAYLIST') {
            result.tracks.forEach(t => player.queue.add(t));
            msg.reply(`📃 Added playlist **${result.playlistName}** (${result.tracks.length} tracks)`);
        } else {
            const track = result.tracks[0];
            player.queue.add(track);
            if (player.playing) msg.reply(`📝 Queued: **${track.title}** [#${player.queue.length}]`);
        }

        if (!player.playing && !player.paused) player.play();
    }

    async skip(msg) {
        const player = this.kazagumo.players.get(msg.guild.id);
        if (!player?.queue.current) return msg.reply('Nothing playing!');
        const title = player.queue.current.title;
        player.skip();
        msg.reply(`⏭️ Skipped: **${title}**`);
    }

    async stop(msg) {
        const player = this.kazagumo.players.get(msg.guild.id);
        if (!player) return msg.reply('Nothing playing!');
        this.voiceManager?.cleanup(msg.guild.id);
        player.destroy();
        msg.reply('⏹️ Stopped!');
    }

    async pause(msg) {
        const player = this.kazagumo.players.get(msg.guild.id);
        if (!player?.playing) return msg.reply('Nothing playing!');
        player.pause(true);
        msg.reply('⏸️ Paused!');
    }

    async resume(msg) {
        const player = this.kazagumo.players.get(msg.guild.id);
        if (!player?.paused) return msg.reply('Not paused!');
        player.pause(false);
        msg.reply('▶️ Resumed!');
    }

    async queue(msg, args) {
        const player = this.kazagumo.players.get(msg.guild.id);
        if (!player?.queue.current) return msg.reply('Queue empty!');

        const page = parseInt(args[0]) || 1;
        const perPage = 10;
        const q = player.queue;
        const totalPages = Math.ceil(q.length / perPage) || 1;

        let text = `🎵 **Now:** ${q.current.title} [${this.formatDuration(q.current.length)}]\n\n`;
        
        if (q.length > 0) {
            const start = (page - 1) * perPage;
            const tracks = q.slice(start, start + perPage);
            tracks.forEach((t, i) => {
                text += `${start + i + 1}. ${t.title} [${this.formatDuration(t.length)}]\n`;
            });
            text += `\n📊 Page ${page}/${totalPages} | ${q.length} tracks | Vol: ${player.volume}%`;
        } else {
            text += 'Queue empty - add more songs!';
        }

        msg.reply(text.substring(0, 2000));
    }

    async nowPlaying(msg) {
        const player = this.kazagumo.players.get(msg.guild.id);
        if (!player?.queue.current) return msg.reply('Nothing playing!');

        const t = player.queue.current;
        const pos = player.position;
        const dur = t.length;
        const bar = this.progressBar(pos, dur);

        msg.reply(
            `🎵 **${t.title}**\n` +
            `${bar}\n` +
            `${this.formatDuration(pos)} / ${this.formatDuration(dur)}\n` +
            `By: ${t.author || 'Unknown'} | Vol: ${player.volume}% | Loop: ${player.loop || 'off'}`
        );
    }

    async volume(msg, args) {
        const player = this.kazagumo.players.get(msg.guild.id);
        if (!player) return msg.reply('Nothing playing!');

        const vol = parseInt(args[0]);
        if (isNaN(vol) || vol < 0 || vol > 150) return msg.reply('Volume: 0-150');

        player.setVolume(vol);
        msg.reply(`🔊 Volume: ${vol}%`);
    }

    async loop(msg, args) {
        const player = this.kazagumo.players.get(msg.guild.id);
        if (!player) return msg.reply('Nothing playing!');

        const modes = { off: 'none', none: 'none', track: 'track', queue: 'queue' };
        const mode = args[0]?.toLowerCase();

        if (!mode) {
            const current = player.loop || 'none';
            const next = current === 'none' ? 'track' : current === 'track' ? 'queue' : 'none';
            player.setLoop(next);
            msg.reply(`🔁 Loop: ${next}`);
        } else if (modes[mode]) {
            player.setLoop(modes[mode]);
            msg.reply(`🔁 Loop: ${modes[mode]}`);
        } else {
            msg.reply('Use: off, track, queue');
        }
    }

    async shuffle(msg) {
        const player = this.kazagumo.players.get(msg.guild.id);
        if (!player || player.queue.length < 2) return msg.reply('Need 2+ songs to shuffle!');
        player.queue.shuffle();
        msg.reply(`🔀 Shuffled ${player.queue.length} tracks!`);
    }

    async seek(msg, args) {
        const player = this.kazagumo.players.get(msg.guild.id);
        if (!player?.queue.current) return msg.reply('Nothing playing!');

        const time = this.parseTime(args[0]);
        if (time === null) return msg.reply('Invalid time! Use: 1:30 or 90');
        if (time > player.queue.current.length) return msg.reply('Time exceeds duration!');

        player.seek(time);
        msg.reply(`⏩ Seeked to ${this.formatDuration(time)}`);
    }

    async remove(msg, args) {
        const player = this.kazagumo.players.get(msg.guild.id);
        if (!player || !player.queue.length) return msg.reply('Queue empty!');

        const idx = parseInt(args[0]) - 1;
        if (isNaN(idx) || idx < 0 || idx >= player.queue.length) {
            return msg.reply(`Invalid! Use 1-${player.queue.length}`);
        }

        const removed = player.queue.splice(idx, 1)[0];
        msg.reply(`🗑️ Removed: **${removed.title}**`);
    }

    async clear(msg) {
        const player = this.kazagumo.players.get(msg.guild.id);
        if (!player) return msg.reply('Nothing playing!');

        const count = player.queue.length;
        player.queue.clear();
        msg.reply(`🗑️ Cleared ${count} tracks!`);
    }

    // Utilities
    formatDuration(ms) {
        if (!ms) return '🔴 Live';
        const s = Math.floor((ms / 1000) % 60);
        const m = Math.floor((ms / 60000) % 60);
        const h = Math.floor(ms / 3600000);
        return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
    }

    parseTime(str) {
        if (!str) return null;
        if (str.includes(':')) {
            const p = str.split(':').map(Number);
            return p.length === 2 ? (p[0] * 60 + p[1]) * 1000 : (p[0] * 3600 + p[1] * 60 + p[2]) * 1000;
        }
        const n = parseInt(str);
        return isNaN(n) ? null : n * 1000;
    }

    progressBar(current, total, len = 15) {
        const progress = Math.round((current / total) * len);
        return '▬'.repeat(progress) + '🔘' + '▬'.repeat(len - progress);
    }

    isURL(str) {
        return /^https?:\/\//i.test(str);
    }
}

module.exports = MusicModule;
