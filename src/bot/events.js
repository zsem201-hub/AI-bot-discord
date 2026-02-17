// ==================== DISCORD EVENTS (MENTION + BYPASS CHANNEL) ====================
const { Events, ActivityType } = require('discord.js');
const commands = require('./commands');
const aiManager = require('../ai/manager');
const ContextManager = require('../ai/context');
const settings = require('../config/settings');
const logger = require('../services/logger');
const { isOwner } = require('../utils/permissions');

const contextManager = new ContextManager();
const lastResponse = new Map(); // Cooldown tracking

module.exports = {
    register(client, context = {}) {
        const { voiceManager, musicModule } = context;

        // Ready event
        client.once(Events.ClientReady, (c) => {
            logger.info(`✅ ${c.user.tag} online! Servers: ${c.guilds.cache.size}`);
            client.user.setActivity(`@${c.user.username} untuk chat`, { type: ActivityType.Listening });
        });

        // Message event
        client.on(Events.MessageCreate, async (message) => {
            // Ignore bots
            if (message.author.bot) return;

            const channelId = message.channel.id;
            const guildId = message.guild?.id;
            const userId = message.author.id;
            const content = message.content.trim();

            // 1. Check if command
            if (content.startsWith(settings.prefix)) {
                const handled = await commands.handle(message, { voiceManager, musicModule });
                if (handled) return;
            }

            // 2. Check bypass channel (auto-reply without command/mention)
            if (settings.bypassSettings.enabled && settings.bypassChannels.includes(channelId)) {
                await handleBypassChannel(message, client);
                return;
            }

            // 3. Check mention
            const mentioned = message.mentions.has(client.user) || 
                              content.toLowerCase().includes(`<@${client.user.id}>`) ||
                              content.toLowerCase().includes(`<@!${client.user.id}>`);

            if (mentioned) {
                await handleMention(message, client);
                return;
            }

            // 4. Check reply to bot
            if (settings.mentionSettings.respondToReply && message.reference) {
                try {
                    const repliedMsg = await message.channel.messages.fetch(message.reference.messageId);
                    if (repliedMsg.author.id === client.user.id) {
                        await handleMention(message, client);
                        return;
                    }
                } catch (e) {}
            }
        });

        // Error handling
        client.on(Events.Error, (error) => logger.error('Discord error:', error));
        client.on(Events.Warn, (info) => logger.warn('Discord warning:', info));
    }
};

// Handle mention (single user context)
async function handleMention(message, client) {
    const userId = message.author.id;
    const channelId = message.channel.id;

    // Remove mention from content
    let content = message.content
        .replace(new RegExp(`<@!?${client.user.id}>`, 'g'), '')
        .trim();

    if (!content) {
        message.reply('Halo! Ada yang bisa saya bantu? 😊');
        return;
    }

    // Cooldown check
    const lastTime = lastResponse.get(userId) || 0;
    if (Date.now() - lastTime < 1000) return;
    lastResponse.set(userId, Date.now());

    await message.channel.sendTyping();

    try {
        const response = await aiManager.chat({
            message: content,
            userId: userId,
            channelId: channelId
        });

        await commands.sendPlain(message, response.text);

    } catch (error) {
        logger.error('Mention response error:', error);
        message.reply(`Maaf, ada error: ${error.message}`);
    }
}

// Handle bypass channel (multi-user context)
async function handleBypassChannel(message, client) {
    const channelId = message.channel.id;
    const username = message.author.username;
    const content = message.content.trim();

    // Ignore if starts with prefix (let command handler deal with it)
    if (settings.bypassSettings.ignorePrefix && content.startsWith(settings.prefix)) {
        return;
    }

    // Ignore very short messages
    if (content.length < 2) return;

    // Add user message to channel context
    contextManager.addChannelMessage(channelId, username, content, false);

    // Cooldown check (per channel)
    const lastTime = lastResponse.get(`channel:${channelId}`) || 0;
    const cooldown = settings.bypassSettings.cooldown || 1000;
    if (Date.now() - lastTime < cooldown) return;

    // Don't respond to every message - use smart detection
    const shouldRespond = checkShouldRespond(message, client, channelId);
    if (!shouldRespond) return;

    lastResponse.set(`channel:${channelId}`, Date.now());

    await message.channel.sendTyping();

    try {
        // Build multi-user context
        const channelContext = contextManager.buildMultiUserContext(channelId);
        const participants = contextManager.getRecentParticipants(channelId);

        // Create system prompt for multi-user
        let systemPrompt = settings.bypassSettings.systemPrompt;
        if (participants.length > 1) {
            systemPrompt += `\n\nParticipants dalam chat: ${participants.join(', ')}. ` +
                           `Pesan terakhir dari ${username}.`;
        }

        const response = await aiManager.chat({
            message: `[${username}]: ${content}`,
            userId: `channel:${channelId}`, // Use channel as "user" for multi-user
            channelId: channelId,
            systemPrompt: systemPrompt,
            context: channelContext
        });

        // Add bot response to context
        contextManager.addChannelMessage(channelId, client.user.username, response.text, true);

        // Send response
        const responseText = response.text.substring(0, settings.bypassSettings.maxResponseLength || 2000);
        await message.reply(responseText);

    } catch (error) {
        logger.error('Bypass channel error:', error);
        // Don't reply with error in bypass channel to avoid spam
    }
}

// Smart detection: should bot respond?
function checkShouldRespond(message, client, channelId) {
    const content = message.content.toLowerCase();
    const botName = client.user.username.toLowerCase();

    // Always respond if mentioned by name
    if (content.includes(botName) || content.includes('bot')) return true;

    // Respond to questions
    if (content.includes('?')) return true;

    // Respond to greetings
    const greetings = ['halo', 'hai', 'hi', 'hello', 'hey', 'pagi', 'siang', 'malam', 'helo'];
    if (greetings.some(g => content.startsWith(g))) return true;

    // Respond to thanks
    const thanks = ['makasih', 'thanks', 'thank', 'terima kasih', 'thx'];
    if (thanks.some(t => content.includes(t))) return true;

    // Respond to direct address patterns
    if (content.startsWith('tolong') || content.startsWith('please') || content.startsWith('bisa')) return true;

    // Random chance to respond to keep conversation alive (20%)
    const recentMessages = contextManager.getChannelContext(channelId, 5);
    const lastBotMessage = recentMessages.findIndex(m => m.role === 'assistant');
    
    // If bot hasn't responded in last 5 messages, higher chance
    if (lastBotMessage === -1 || lastBotMessage > 3) {
        return Math.random() < 0.4; // 40% chance
    }

    // Lower chance if bot just responded
    return Math.random() < 0.15; // 15% chance
}
