// ==================== AI MODELS CONFIGURATION ====================
// Default: Groq dengan Kimi K2 (1T params, 256K context, super fast)

const AI_PROVIDERS = {
    // ==================== GROQ (PRIMARY - FREE & FAST) ====================
    groq: {
        name: 'Groq',
        requiresKey: true,
        default: true,
        models: [
            // KIMI K2 - RECOMMENDED DEFAULT
            { id: 'moonshotai/kimi-k2-instruct-0905', name: 'Kimi K2', version: '0905', category: 'powerful', default: true, context: 256000 },
            { id: 'moonshotai/kimi-k2-instruct', name: 'Kimi K2 (Latest)', version: 'latest', category: 'powerful', context: 256000 },
            
            // LLAMA 4
            { id: 'meta-llama/llama-4-scout-17b-16e-instruct', name: 'Llama 4 Scout', version: '17B', category: 'general', context: 131072 },
            { id: 'meta-llama/llama-4-maverick-17b-128e-instruct', name: 'Llama 4 Maverick', version: '17B', category: 'general', context: 131072 },
            
            // LLAMA 3.3
            { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', version: '3.3', category: 'general', context: 128000 },
            { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B', version: '3.1', category: 'fast', context: 128000 },
            
            // QWEN
            { id: 'qwen/qwen3-32b', name: 'Qwen 3 32B', version: '32B', category: 'general', context: 32768 },
            
            // MIXTRAL
            { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', version: '8x7B', category: 'general', context: 32768 },
            
            // GEMMA
            { id: 'gemma2-9b-it', name: 'Gemma 2 9B', version: '9B', category: 'fast', context: 8192 },
            
            // TOOL USE
            { id: 'llama-3-groq-70b-tool-use', name: 'Llama 3 70B Tool', version: '70B', category: 'tool-use', context: 8192 },
            { id: 'llama-3-groq-8b-tool-use', name: 'Llama 3 8B Tool', version: '8B', category: 'tool-use', context: 8192 }
        ],
        features: ['chat', 'streaming', 'tool-use'],
        rateLimit: { requests: 30, per: 'minute' }
    },

    // ==================== GEMINI (BACKUP) ====================
    gemini: {
        name: 'Google Gemini',
        requiresKey: true,
        models: [
            { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', version: '2.0', category: 'fast', default: true },
            { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash Exp', version: '2.0-exp', category: 'fast' },
            { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', version: '1.5', category: 'powerful' },
            { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', version: '1.5', category: 'fast' }
        ],
        features: ['chat', 'vision', 'streaming', 'function-calling'],
        rateLimit: { requests: 60, per: 'minute' }
    },

    // ==================== OPENROUTER (MANY FREE MODELS) ====================
    openrouter: {
        name: 'OpenRouter',
        requiresKey: true,
        models: [
            { id: 'moonshotai/kimi-k2:free', name: 'Kimi K2 (Free)', version: 'K2', category: 'powerful', free: true },
            { id: 'google/gemini-2.0-flash-exp:free', name: 'Gemini 2.0 Flash (Free)', version: '2.0', category: 'fast', free: true },
            { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Llama 3.3 70B (Free)', version: '70B', category: 'general', free: true },
            { id: 'deepseek/deepseek-r1-0528:free', name: 'DeepSeek R1 (Free)', version: 'R1', category: 'reasoning', free: true },
            { id: 'qwen/qwen3-32b:free', name: 'Qwen 3 32B (Free)', version: '32B', category: 'general', free: true },
            { id: 'mistralai/mistral-small-3.1-24b-instruct:free', name: 'Mistral Small (Free)', version: '24B', category: 'general', free: true }
        ],
        features: ['chat', 'streaming'],
        rateLimit: { requests: 200, per: 'minute' }
    },

    // ==================== POLLINATIONS (FREE, NO KEY) ====================
    pollinations: {
        name: 'Pollinations',
        requiresKey: false,
        models: [
            { id: 'openai', name: 'OpenAI', version: 'GPT', category: 'general' },
            { id: 'claude', name: 'Claude', version: 'Claude', category: 'general' },
            { id: 'gemini', name: 'Gemini', version: 'Gemini', category: 'general' },
            { id: 'deepseek', name: 'DeepSeek', version: 'V3', category: 'general' },
            { id: 'deepseek-r1', name: 'DeepSeek R1', version: 'R1', category: 'reasoning' },
            { id: 'qwen', name: 'Qwen', version: 'Qwen', category: 'general' },
            { id: 'llama', name: 'Llama', version: 'Llama', category: 'general' },
            { id: 'mistral', name: 'Mistral', version: 'Mistral', category: 'general' }
        ],
        features: ['chat', 'streaming'],
        rateLimit: { requests: 10, per: 'minute' }
    },

    // ==================== HUGGINGFACE ====================
    huggingface: {
        name: 'HuggingFace',
        requiresKey: true,
        models: [
            { id: 'meta-llama/Llama-3.3-70B-Instruct', name: 'Llama 3.3 70B', version: '70B', category: 'powerful' },
            { id: 'mistralai/Mistral-7B-Instruct-v0.1', name: 'Mistral 7B', version: '7B', category: 'fast' },
            { id: 'Qwen/Qwen2.5-72B-Instruct', name: 'Qwen 2.5 72B', version: '72B', category: 'powerful' }
        ],
        features: ['chat'],
        rateLimit: { requests: 100, per: 'hour' }
    }
};

// Helper functions
const getDefaultModel = () => {
    return {
        provider: 'groq',
        model: 'moonshotai/kimi-k2-instruct-0905',
        name: 'Kimi K2'
    };
};

const getAllModels = () => {
    const all = [];
    for (const [providerId, provider] of Object.entries(AI_PROVIDERS)) {
        provider.models.forEach(model => {
            all.push({ ...model, provider: providerId, providerName: provider.name });
        });
    }
    return all;
};

const findModel = (modelId, providerId = null) => {
    if (providerId && AI_PROVIDERS[providerId]) {
        return AI_PROVIDERS[providerId].models.find(m => m.id === modelId);
    }
    for (const provider of Object.values(AI_PROVIDERS)) {
        const model = provider.models.find(m => m.id === modelId);
        if (model) return model;
    }
    return null;
};

const getModelsByProvider = (providerId) => {
    return AI_PROVIDERS[providerId]?.models || [];
};

const getRecommendedModels = () => ({
    fast: { provider: 'groq', model: 'llama-3.1-8b-instant' },
    balanced: { provider: 'groq', model: 'moonshotai/kimi-k2-instruct-0905' },
    powerful: { provider: 'groq', model: 'moonshotai/kimi-k2-instruct-0905' },
    coding: { provider: 'groq', model: 'moonshotai/kimi-k2-instruct-0905' },
    reasoning: { provider: 'openrouter', model: 'deepseek/deepseek-r1-0528:free' },
    free: { provider: 'pollinations', model: 'deepseek-r1' }
});

module.exports = {
    AI_PROVIDERS,
    getDefaultModel,
    getAllModels,
    findModel,
    getModelsByProvider,
    getRecommendedModels
};
