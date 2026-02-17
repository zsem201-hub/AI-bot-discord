// ==================== AI MANAGER ====================
// Main orchestrator for all AI providers
// Handles routing, context, and provider management

const providers = {
    pollinations: require('./providers/pollinations'),
    pollinations_api: require('./providers/pollinations'),
    gemini: require('./providers/gemini'),
    groq: require('./providers/groq'),
    openrouter: require('./providers/openrouter'),
    huggingface: require('./providers/huggingface')
};

const { AI_PROVIDERS, findModel, getRecommendedModels } = require('../config/ai-models');
const ContextManager = require('./context');
const logger = require('../services/logger');
const db = require('../services/database');

class AIManager {
    constructor() {
        this.defaultProvider = 'gemini';
        this.defaultModel = 'gemini-3-flash';
        this.contextManager = new ContextManager();
        this.userPreferences = new Map();
        this.rateLimits = new Map();
    }

    /**
     * Main chat method - routes to appropriate provider
     */
    async chat({ message, userId, channelId, model, provider, systemPrompt, temperature, maxTokens }) {
        try {
            // Get user preferences
            const userPref = await this.getUserPreferences(userId);
            provider = provider || userPref.provider || this.defaultProvider;
            model = model || userPref.model || this.defaultModel;

            // Check rate limits
            if (!await this.checkRateLimit(userId, provider)) {
                throw new Error('Rate limit exceeded. Please wait a moment.');
            }

            // Get conversation context
            const context = await this.contextManager.get(userId, channelId);

            // Prepare request
            const request = {
                message,
                model,
                context,
                systemPrompt: systemPrompt || userPref.systemPrompt,
                temperature: temperature || userPref.temperature || 0.7,
                maxTokens: maxTokens || 2000,
                userId,
                channelId
            };

            // Route to provider
            logger.info(`Routing to ${provider} with model ${model}`);
            const providerService = providers[provider];
            
            if (!providerService) {
                throw new Error(`Provider ${provider} not found`);
            }

            // Call provider
            const startTime = Date.now();
            const response = await providerService.chat(request);
            const duration = Date.now() - startTime;

            // Save to context
            await this.contextManager.add(userId, channelId, {
                role: 'user',
                content: message
            });
            await this.contextManager.add(userId, channelId, {
                role: 'assistant',
                content: response.text
            });

            // Log usage
            await this.logUsage({
                userId,
                provider,
                model,
                tokens: response.tokens || 0,
                duration,
                success: true
            });

            return {
                text: response.text,
                model,
                provider,
                tokens: response.tokens,
                duration,
                cached: response.cached || false
            };

        } catch (error) {
            logger.error(`AI Manager error: ${error.message}`);
            
            // Try fallback
            if (provider !== this.defaultProvider) {
                logger.info(`Trying fallback to ${this.defaultProvider}`);
                return this.chat({
                    message,
                    userId,
                    channelId,
                    provider: this.defaultProvider,
                    systemPrompt,
                    temperature,
                    maxTokens
                });
            }

            throw error;
        }
    }

    /**
     * Streaming chat for real-time responses
     */
    async *chatStream({ message, userId, channelId, model, provider, systemPrompt }) {
        try {
            const userPref = await this.getUserPreferences(userId);
            provider = provider || userPref.provider || this.defaultProvider;
            model = model || userPref.model || this.defaultModel;

            if (!await this.checkRateLimit(userId, provider)) {
                throw new Error('Rate limit exceeded');
            }

            const context = await this.contextManager.get(userId, channelId);
            const providerService = providers[provider];

            if (!providerService.chatStream) {
                throw new Error(`Provider ${provider} doesn't support streaming`);
            }

            const request = {
                message,
                model,
                context,
                systemPrompt: systemPrompt || userPref.systemPrompt
            };

            let fullResponse = '';
            for await (const chunk of providerService.chatStream(request)) {
                fullResponse += chunk;
                yield chunk;
            }

            // Save context after stream completes
            await this.contextManager.add(userId, channelId, {
                role: 'user',
                content: message
            });
            await this.contextManager.add(userId, channelId, {
                role: 'assistant',
                content: fullResponse
            });

        } catch (error) {
            logger.error(`Stream error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Switch model for user
     */
    async switchModel(userId, model, provider = null) {
        try {
            // Validate model exists
            const modelInfo = findModel(model, provider);
            if (!modelInfo) {
                throw new Error(`Model ${model} not found`);
            }

            // Update user preferences
            const prefs = await this.getUserPreferences(userId);
            prefs.model = model;
            if (provider) {
                prefs.provider = provider;
            }
            
            await this.saveUserPreferences(userId, prefs);
            
            return {
                success: true,
                model: modelInfo.name,
                provider: provider || prefs.provider
            };

        } catch (error) {
            logger.error(`Switch model error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get available models for provider
     */
    getModels(provider = null) {
        if (provider) {
            const providerInfo = AI_PROVIDERS[provider];
            if (!providerInfo) return [];
            return providerInfo.models;
        }

        // Return all models grouped by provider
        const allModels = {};
        for (const [key, value] of Object.entries(AI_PROVIDERS)) {
            allModels[key] = {
                name: value.name,
                models: value.models,
                features: value.features,
                requiresKey: value.requiresKey
            };
        }
        return allModels;
    }

    /**
     * Get model recommendations
     */
    getRecommendations() {
        return getRecommendedModels();
    }

    /**
     * Reset conversation context
     */
    async resetContext(userId, channelId) {
        await this.contextManager.clear(userId, channelId);
        return { success: true, message: 'Conversation context cleared' };
    }

    /**
     * Get conversation history
     */
    async getHistory(userId, channelId, limit = 20) {
        return await this.contextManager.get(userId, channelId, limit);
    }

    /**
     * Set system prompt for user
     */
    async setSystemPrompt(userId, prompt) {
        const prefs = await this.getUserPreferences(userId);
        prefs.systemPrompt = prompt;
        await this.saveUserPreferences(userId, prefs);
        return { success: true };
    }

    /**
     * Get user preferences
     */
    async getUserPreferences(userId) {
        // Check cache first
        if (this.userPreferences.has(userId)) {
            return this.userPreferences.get(userId);
        }

        // Load from database
        const prefs = await db.getUserPreferences(userId) || {
            provider: this.defaultProvider,
            model: this.defaultModel,
            systemPrompt: null,
            temperature: 0.7,
            language: 'en'
        };

        this.userPreferences.set(userId, prefs);
        return prefs;
    }

    /**
     * Save user preferences
     */
    async saveUserPreferences(userId, prefs) {
        this.userPreferences.set(userId, prefs);
        await db.saveUserPreferences(userId, prefs);
    }

    /**
     * Check rate limits
     */
    async checkRateLimit(userId, provider) {
        const key = `${userId}:${provider}`;
        const now = Date.now();
        const limit = AI_PROVIDERS[provider]?.rateLimit || { requests: 60, per: 'minute' };
        
        if (!this.rateLimits.has(key)) {
            this.rateLimits.set(key, {
                count: 0,
                resetAt: now + this.getTimeWindow(limit.per)
            });
        }

        const userLimit = this.rateLimits.get(key);

        // Reset if time window passed
        if (now > userLimit.resetAt) {
            userLimit.count = 0;
            userLimit.resetAt = now + this.getTimeWindow(limit.per);
        }

        // Check limit
        if (userLimit.count >= limit.requests) {
            return false;
        }

        userLimit.count++;
        return true;
    }

    /**
     * Get time window in milliseconds
     */
    getTimeWindow(period) {
        const windows = {
            'second': 1000,
            'minute': 60 * 1000,
            'hour': 60 * 60 * 1000,
            'day': 24 * 60 * 60 * 1000
        };
        return windows[period] || windows.minute;
    }

    /**
     * Log API usage
     */
    async logUsage(data) {
        try {
            await db.logUsage({
                userId: data.userId,
                provider: data.provider,
                model: data.model,
                tokens: data.tokens,
                duration: data.duration,
                success: data.success,
                timestamp: Date.now()
            });
        } catch (error) {
            logger.error(`Failed to log usage: ${error.message}`);
        }
    }

    /**
     * Get usage statistics
     */
    async getUsageStats(userId = null, period = 'day') {
        return await db.getUsageStats(userId, period);
    }

    /**
     * Check provider health
     */
    async checkHealth() {
        const health = {};
        
        for (const [name, provider] of Object.entries(providers)) {
            try {
                const isHealthy = await provider.healthCheck?.() ?? true;
                health[name] = {
                    status: isHealthy ? 'healthy' : 'unhealthy',
                    available: true
                };
            } catch (error) {
                health[name] = {
                    status: 'error',
                    available: false,
                    error: error.message
                };
            }
        }

        return health;
    }

    /**
     * Analyze image with vision models
     */
    async analyzeImage({ imageUrl, prompt, userId, model = 'gemini-3-pro' }) {
        try {
            // Use Gemini for vision by default
            const provider = providers.gemini;
            
            if (!provider.analyzeImage) {
                throw new Error('Vision analysis not supported by this provider');
            }

            const response = await provider.analyzeImage({
                imageUrl,
                prompt: prompt || 'Describe this image in detail',
                model
            });

            await this.logUsage({
                userId,
                provider: 'gemini',
                model,
                tokens: response.tokens || 0,
                duration: 0,
                success: true
            });

            return response;

        } catch (error) {
            logger.error(`Image analysis error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Function calling / Tool use
     */
    async chatWithTools({ message, userId, channelId, tools, model = 'gemini-3-pro' }) {
        try {
            const provider = providers.gemini; // Gemini has best tool support
            
            if (!provider.chatWithTools) {
                throw new Error('Tool calling not supported by this provider');
            }

            const context = await this.contextManager.get(userId, channelId);
            
            const response = await provider.chatWithTools({
                message,
                model,
                context,
                tools
            });

            // Save context
            await this.contextManager.add(userId, channelId, {
                role: 'user',
                content: message
            });
            await this.contextManager.add(userId, channelId, {
                role: 'assistant',
                content: response.text
            });

            return response;

        } catch (error) {
            logger.error(`Tool calling error: ${error.message}`);
            throw error;
        }
    }
}

// Export singleton instance
module.exports = new AIManager();
