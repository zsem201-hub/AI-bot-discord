// ==================== CONTEXT MANAGER ====================
// Manages conversation history and context windows

const logger = require('../services/logger');
const db = require('../services/database');

class ContextManager {
    constructor() {
        // In-memory cache for fast access
        this.cache = new Map();
        this.maxContextMessages = 50; // Max messages to keep in memory
        this.maxContextLength = 32000; // Max characters in context
    }

    /**
     * Get conversation context
     */
    async get(userId, channelId, limit = null) {
        const key = this.getKey(userId, channelId);
        
        // Try cache first
        if (this.cache.has(key)) {
            const context = this.cache.get(key);
            return limit ? context.slice(-limit) : context;
        }

        // Load from database
        const context = await db.getConversationHistory(userId, channelId, limit || this.maxContextMessages);
        this.cache.set(key, context);
        
        return context;
    }

    /**
     * Add message to context
     */
    async add(userId, channelId, message) {
        const key = this.getKey(userId, channelId);
        
        // Get current context
        let context = await this.get(userId, channelId);
        
        // Add new message
        context.push({
            role: message.role,
            content: message.content,
            timestamp: Date.now()
        });

        // Trim if too long
        context = this.trimContext(context);

        // Update cache
        this.cache.set(key, context);

        // Save to database (async, don't wait)
        db.saveMessage(userId, channelId, message).catch(err => {
            logger.error(`Failed to save message: ${err.message}`);
        });
    }

    /**
     * Clear conversation context
     */
    async clear(userId, channelId) {
        const key = this.getKey(userId, channelId);
        this.cache.delete(key);
        await db.clearConversation(userId, channelId);
    }

    /**
     * Get context summary
     */
    async getSummary(userId, channelId) {
        const context = await this.get(userId, channelId);
        
        const summary = {
            messageCount: context.length,
            userMessages: context.filter(m => m.role === 'user').length,
            assistantMessages: context.filter(m => m.role === 'assistant').length,
            totalCharacters: context.reduce((sum, m) => sum + m.content.length, 0),
            oldestMessage: context[0]?.timestamp,
            newestMessage: context[context.length - 1]?.timestamp
        };

        return summary;
    }

    /**
     * Trim context to fit limits
     */
    trimContext(context) {
        // First, trim by message count
        if (context.length > this.maxContextMessages) {
            context = context.slice(-this.maxContextMessages);
        }

        // Then, trim by character count
        let totalLength = context.reduce((sum, m) => sum + m.content.length, 0);
        
        while (totalLength > this.maxContextLength && context.length > 1) {
            const removed = context.shift();
            totalLength -= removed.content.length;
        }

        return context;
    }

    /**
     * Generate cache key
     */
    getKey(userId, channelId) {
        return `${userId}:${channelId}`;
    }

    /**
     * Clear all cache
     */
    clearCache() {
        this.cache.clear();
    }

    /**
     * Get cache size
     */
    getCacheSize() {
        return this.cache.size;
    }
}

module.exports = ContextManager;
