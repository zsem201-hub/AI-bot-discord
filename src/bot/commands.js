// ==================== COMMAND HANDLER (SIMPLIFIED + SHORT ALIASES) ====================
const aiManager = require('../ai/manager');
const settings = require('../config/settings');
const logger = require('../services/logger');
const { isOwner } = require('../utils/permissions');

// Command definitions with SHORT aliases
const commands = {
    // ==================== AI COMMANDS ====================
    ai: {
        aliases: ['ai', 'a', 'ask', 'chat', 'c'],
        desc: 'Chat with AI',
        usage: 'a <message>',
        run: async (msg, args) => {
            if (!args.length) return msg.reply('Tulis pesan! Contoh: !a halo');
            await msg.channel.sendTyping();
            const response = await aiManager.chat({
                message: args.join(' '),
                userId: msg.author.id,
                channelId: msg.channel.id
            });
            await sendPlain(msg, response.text);
        }
    },

    model: {
        aliases: ['model', 'm', 'mdl'],
        desc: 'Change AI model',
        usage: 'm <model> | m list',
        run: async (msg, args) => {
            if (!args.length || args[0] === 'list') {
                const models = aiManager.getModels();
                let text = '📋 Models:\n';
                for (const [provider, data] of Object.entries(models)) {
                    text += `\n${data.name}:\n`;
                    data.models.slice(0, 5).forEach(m => { text += `• ${m.id}\n`; });
                    if (data.models.length > 5) text += `... +${data.models.length - 5} more\n`;
                }
                return msg.reply(text.substring(0, 2000));
            }
            try {
                await aiManager.switchModel(msg.author.id, args[0], args[1]);
                msg.reply(`✓ Model: ${args[0]}`);
            } catch (e) { msg.reply(`✗ ${e.message}`); }
        }
    },

    reset: {
        aliases: ['reset', 'r', 'clr', 'clear'],
        desc: 'Reset chat context',
        usage: 'r',
        run: async (msg) => {
            await aiManager.resetContext(msg.author.id, msg.channel.id);
            msg.reply('✓ Context cleared');
        }
    },

    system: {
        aliases: ['system', 'sys', 'persona'],
        desc: 'Set system prompt',
        usage: 'sys <prompt>',
        run: async (msg, args) => {
            const prompt = args.join(' ') || null;
            await aiManager.setSystemPrompt(msg.author.id, prompt);
            msg.reply(prompt ? `✓ System prompt set` : '✓ System prompt cleared');
        }
    },

    // ==================== TTS COMMANDS ====================
    tts: {
        aliases: ['tts', 't', 'speak', 'say'],
        desc: 'Text to speech',
        usage: 't <text>',
        run: async (msg, args, { voiceManager }) => {
            if (!args.length) return msg.reply('Tulis teks! Contoh: !t halo semua');
            const vc = msg.member.voice.channel;
            if (!vc) return msg.reply('Join voice channel dulu!');
            
            const status = voiceManager.getStatus(msg.guild.id);
            if (status.state === 'MUSIC') {
                return msg.reply('⏳ Music sedang jalan. TTS akan diputar setelah music selesai/stop.');
            }

            await msg.react('🔊');
            const result = await voiceManager.playTTS(
                msg.guild.id, msg.channel.id, vc.id,
                args.join(' '), msg.author.id, isOwner(msg.author.id)
            );
            if (!result.success) {
                await msg.reactions.removeAll().catch(() => {});
                msg.reply(`✗ ${result.error}`);
            } else if (result.queued) {
                msg.reply(`📝 TTS queued #${result.position}`);
            }
        }
    },

    skiptts: {
        aliases: ['skiptts', 'st'],
        desc: 'Skip TTS',
        usage: 'st',
        run: async (msg, args, { voiceManager }) => {
            if (voiceManager.skipTTS(msg.guild.id)) {
                msg.reply('✓ TTS skipped');
            } else {
                msg.reply('No TTS playing');
            }
        }
    },

    // ==================== MUSIC COMMANDS ====================
    play: {
        aliases: ['play', 'p'],
        desc: 'Play music',
        usage: 'p <song>',
        run: async (msg, args, { musicModule }) => {
            if (!musicModule) return msg.reply('Music module not loaded');
            await musicModule.handleCommand(msg, 'play', args);
        }
    },

    skip: {
        aliases: ['skip', 's', 'sk', 'next', 'n'],
        desc: 'Skip song',
        usage: 's',
        run: async (msg, args, { musicModule }) => {
            if (!musicModule) return msg.reply('Music module not loaded');
            await musicModule.handleCommand(msg, 'skip', args);
        }
    },

    stop: {
        aliases: ['stop', 'dc', 'leave', 'disconnect'],
        desc: 'Stop music',
        usage: 'dc',
        run: async (msg, args, { musicModule }) => {
            if (!musicModule) return msg.reply('Music module not loaded');
            await musicModule.handleCommand(msg, 'stop', args);
        }
    },

    queue: {
        aliases: ['queue', 'q'],
        desc: 'View queue',
        usage: 'q',
        run: async (msg, args, { musicModule }) => {
            if (!musicModule) return msg.reply('Music module not loaded');
            await musicModule.handleCommand(msg, 'queue', args);
        }
    },

    np: {
        aliases: ['np', 'now', 'playing'],
        desc: 'Now playing',
        usage: 'np',
        run: async (msg, args, { musicModule }) => {
            if (!musicModule) return msg.reply('Music module not loaded');
            await musicModule.handleCommand(msg, 'nowplaying', args);
        }
    },

    vol: {
        aliases: ['vol', 'v', 'volume'],
        desc: 'Set volume',
        usage: 'v <0-150>',
        run: async (msg, args, { musicModule }) => {
            if (!musicModule) return msg.reply('Music module not loaded');
            await musicModule.handleCommand(msg, 'volume', args);
        }
    },

    loop: {
        aliases: ['loop', 'lp', 'repeat'],
        desc: 'Loop mode',
        usage: 'lp <off/track/queue>',
        run: async (msg, args, { musicModule }) => {
            if (!musicModule) return msg.reply('Music module not loaded');
            await musicModule.handleCommand(msg, 'loop', args);
        }
    },

    shuffle: {
        aliases: ['shuffle', 'sf', 'mix'],
        desc: 'Shuffle queue',
        usage: 'sf',
        run: async (msg, args, { musicModule }) => {
            if (!musicModule) return msg.reply('Music module not loaded');
            await musicModule.handleCommand(msg, 'shuffle', args);
        }
    },

    // ==================== UTILITY COMMANDS ====================
    help: {
        aliases: ['help', 'h', 'hl', '?'],
        desc: 'Show commands',
        usage: 'hl',
        run: async (msg) => {
            let text = '📖 Commands:\n\n';
            text += '🤖 AI:\n';
            text += '!a <msg> - Chat AI\n';
            text += '!m list - List models\n';
            text += '!m <model> - Change model\n';
            text += '!r - Reset context\n';
            text += '!sys <prompt> - Set persona\n\n';
            text += '🔊 TTS:\n';
            text += '!t <text> - Text to speech\n';
            text += '!st - Skip TTS\n\n';
            text += '🎵 Music:\n';
            text += '!p <song> - Play\n';
            text += '!s - Skip\n';
            text += '!dc - Stop/Leave\n';
            text += '!q - Queue\n';
            text += '!np - Now playing\n';
            text += '!v <0-150> - Volume\n';
            text += '!lp - Loop\n';
            text += '!sf - Shuffle\n\n';
            text += '💡 Tips:\n';
            text += '• Mention bot untuk chat tanpa command\n';
            text += '• Di bypass channel, langsung chat tanpa command';
            msg.reply(text);
        }
    },

    ping: {
        aliases: ['ping', 'pg'],
        desc: 'Check latency',
        usage: 'pg',
        run: async (msg) => {
            const sent = await msg.reply('Pinging...');
            const latency = sent.createdTimestamp - msg.createdTimestamp;
            sent.edit(`🏓 Latency: ${latency}ms | API: ${Math.round(msg.client.ws.ping)}ms`);
        }
    },

    status: {
        aliases: ['status', 'stat', 'vs'],
        desc: 'Voice status',
        usage: 'vs',
        run: async (msg, args, { voiceManager, musicModule }) => {
            const status = voiceManager.getStatus(msg.guild.id);
            let text = '🎛️ Voice Status:\n';
            text += `State: ${status.state}\n`;
            text += `Music: ${status.musicPlaying ? '▶️ Playing' : '⏹️ Stopped'}\n`;
            text += `TTS: ${status.ttsPlaying ? '🔊 Playing' : '⏹️ Idle'}\n`;
            text += `Music Queue: ${status.musicQueueLength}\n`;
            text += `TTS Queue: ${status.ttsQueueLength}`;
            msg.reply(text);
        }
    },

    bypass: {
        aliases: ['bypass', 'bp'],
        desc: 'Manage bypass channels (owner)',
        usage: 'bp add/remove/list',
        ownerOnly: true,
        run: async (msg, args) => {
            if (!isOwner(msg.author.id)) return msg.reply('Owner only!');
            const sub = args[0]?.toLowerCase();
            if (sub === 'add') {
                const channelId = args[1] || msg.channel.id;
                if (!settings.bypassChannels.includes(channelId)) {
                    settings.bypassChannels.push(channelId);
                }
                msg.reply(`✓ Channel <#${channelId}> added to bypass`);
            } else if (sub === 'remove' || sub === 'rm') {
                const channelId = args[1] || msg.channel.id;
                const idx = settings.bypassChannels.indexOf(channelId);
                if (idx > -1) settings.bypassChannels.splice(idx, 1);
                msg.reply(`✓ Channel removed from bypass`);
            } else {
                let text = 'Bypass Channels:\n';
                settings.bypassChannels.forEach(id => { text += `• <#${id}>\n`; });
                if (!settings.bypassChannels.length) text += '(none)';
                msg.reply(text);
            }
        }
    }
};

// Build alias map
const aliasMap = new Map();
for (const [name, cmd] of Object.entries(commands)) {
    for (const alias of cmd.aliases) {
        aliasMap.set(alias, cmd);
    }
}

// Send plain text (split if too long)
async function sendPlain(msg, text) {
    if (!text) return;
    const chunks = splitText(text, 2000);
    for (const chunk of chunks) {
        await msg.reply(chunk);
    }
}

function splitText(text, maxLen = 2000) {
    if (text.length <= maxLen) return [text];
    const chunks = [];
    let current = '';
    const lines = text.split('\n');
    for (const line of lines) {
        if (current.length + line.length + 1 > maxLen) {
            if (current) chunks.push(current);
            current = line.length > maxLen ? line.substring(0, maxLen) : line;
        } else {
            current += (current ? '\n' : '') + line;
        }
    }
    if (current) chunks.push(current);
    return chunks;
}

module.exports = {
    async handle(msg, context = {}) {
        const prefix = settings.prefix;
        if (!msg.content.startsWith(prefix)) return false;

        const args = msg.content.slice(prefix.length).trim().split(/ +/);
        const cmdName = args.shift().toLowerCase();
        const cmd = aliasMap.get(cmdName);

        if (!cmd) return false;
        if (cmd.ownerOnly && !isOwner(msg.author.id)) {
            msg.reply('Owner only command!');
            return true;
        }

        try {
            await cmd.run(msg, args, context);
        } catch (error) {
            logger.error(`Command error (${cmdName}):`, error);
            msg.reply(`Error: ${error.message}`);
        }
        return true;
    },

    getCommand(name) {
        return aliasMap.get(name.toLowerCase());
    },

    getAllCommands() {
        return commands;
    },

    sendPlain,
    splitText
};
