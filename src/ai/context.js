// ==================== CONTEXT MANAGER (MULTI-USER SUPPORT) ====================
const logger = require('../services/logger');

class ContextManager {
    constructor() {
        this.conversations = new Map();
        this.channelConversations = new Map(); // For bypass channels (multi-user)
        this.maxMessages = 30;
        this.maxChannelMessages = 50; // More for multi-user
    }

    // Single user context (DM or mention)
    getKey(userId, channelId) {
        return `${userId}:${channelId}`;
    }

    get(userId, channelId, limit = null) {
        const key = this.getKey(userId, channelId);
        const context = this.conversations.get(key) || [];
        return limit ? context.slice(-limit) : context;
    }

    add(userId, channelId, message) {
        const key = this.getKey(userId, channelId);
        let context = this.conversations.get(key) || [];
        context.push({ role: message.role, content: message.content, timestamp: Date.now() });
        if (context.length > this.maxMessages) context = context.slice(-this.maxMessages);
        this.conversations.set(key, context);
    }

    clear(userId, channelId) {
        const key = this.getKey(userId, channelId);
        this.conversations.delete(key);
    }

    // Multi-user context for bypass channels
    getChannelContext(channelId, limit = null) {
        const context = this.channelConversations.get(channelId) || [];
        return limit ? context.slice(-limit) : context;
    }

    addChannelMessage(channelId, username, content, isBot = false) {
        let context = this.channelConversations.get(channelId) || [];
        context.push({
            role: isBot ? 'assistant' : 'user',
            username: username,
            content: isBot ? content : `[${username}]: ${content}`,
            timestamp: Date.now()
        });
        if (context.length > this.maxChannelMessages) context = context.slice(-this.maxChannelMessages);
        this.channelConversations.set(channelId, context);
    }

    clearChannel(channelId) {
        this.channelConversations.delete(channelId);
    }

    // Build context for AI (multi-user format)
    buildMultiUserContext(channelId) {
        const context = this.getChannelContext(channelId);
        return context.map(msg => ({
            role: msg.role,
            content: msg.content
        }));
    }

    // Get recent participants in channel
    getRecentParticipants(channelId, limit = 5) {
        const context = this.getChannelContext(channelId);
        const users = new Set();
        for (let i = context.length - 1; i >= 0 && users.size < limit; i--) {
            if (context[i].username && context[i].role === 'user') {
                users.add(context[i].username);
            }
        }
        return Array.from(users);
    }
}

module.exports = ContextManager;
