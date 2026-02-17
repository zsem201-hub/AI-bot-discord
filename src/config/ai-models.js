// ==================== AI MODELS CONFIGURATION ====================
// All available AI models across providers

const POLLINATIONS_MODELS = [
    // OpenAI Models
    { id: 'openai', name: 'OpenAI GPT', version: 'GPT-5.2', category: 'general' },
    { id: 'openai-fast', name: 'OpenAI Fast', version: 'GPT-5.2-fast', category: 'general' },
    { id: 'openai-large', name: 'OpenAI Large', version: 'GPT-5.3-Codex', category: 'coding' },
    { id: 'openai-reasoning', name: 'OpenAI Reasoning', version: 'o4-mini', category: 'reasoning' },
    { id: 'openai-audio', name: 'OpenAI Audio', version: 'GPT-4o-audio', category: 'multimodal' },
    
    // Claude Models
    { id: 'claude', name: 'Claude', version: 'Claude-3.5', category: 'general' },
    { id: 'claude-fast', name: 'Claude Fast', version: 'Claude-fast', category: 'general' },
    { id: 'claude-large', name: 'Claude Large', version: 'Claude-large', category: 'general' },
    { id: 'claude-haiku', name: 'Claude Haiku', version: 'Haiku-4', category: 'fast' },
    { id: 'claude-sonnet', name: 'Claude Sonnet', version: 'Sonnet-4', category: 'balanced' },
    { id: 'claude-opus', name: 'Claude Opus', version: 'Opus-4.6', category: 'powerful' },
    
    // Gemini Models
    { id: 'gemini', name: 'Gemini', version: 'Gemini-3-Flash', category: 'general' },
    { id: 'gemini-fast', name: 'Gemini Fast', version: 'Gemini-3-Flash', category: 'fast' },
    { id: 'gemini-large', name: 'Gemini Large', version: 'Gemini-3-Pro', category: 'powerful' },
    { id: 'gemini-search', name: 'Gemini Search', version: 'Gemini-search', category: 'search' },
    { id: 'gemini-legacy', name: 'Gemini Legacy', version: 'Gemini-2.5-Pro', category: 'general' },
    { id: 'gemini-thinking', name: 'Gemini Deep Think', version: 'Deep-Think', category: 'reasoning' },
    
    // DeepSeek Models
    { id: 'deepseek', name: 'DeepSeek', version: 'V3', category: 'general' },
    { id: 'deepseek-v3', name: 'DeepSeek V3', version: 'V3.2', category: 'general' },
    { id: 'deepseek-r1', name: 'DeepSeek R1', version: 'R1', category: 'reasoning' },
    { id: 'deepseek-reasoning', name: 'DeepSeek Reasoning', version: 'R1-Reasoner', category: 'reasoning' },
    
    // Qwen Models
    { id: 'qwen', name: 'Qwen', version: 'Qwen3-32B', category: 'general' },
    { id: 'qwen-coder', name: 'Qwen Coder', version: 'Qwen3-Coder', category: 'coding' },
    
    // Llama Models
    { id: 'llama', name: 'Llama', version: 'Llama-3.3-70B', category: 'general' },
    { id: 'llama-4', name: 'Llama 4', version: 'Llama-4-Scout', category: 'general' },
    { id: 'llamalight', name: 'Llama Light', version: 'Llama-70B', category: 'fast' },
    
    // Mistral Models
    { id: 'mistral', name: 'Mistral', version: 'Mistral-Small-3.1', category: 'general' },
    { id: 'mistral-small', name: 'Mistral Small', version: 'Mistral-3.2-24B', category: 'fast' },
    { id: 'mistral-large', name: 'Mistral Large', version: 'Mistral-Large-123B', category: 'powerful' },
    
    // Perplexity Models
    { id: 'perplexity-fast', name: 'Perplexity Fast', version: 'Sonar', category: 'search' },
    { id: 'perplexity-reasoning', name: 'Perplexity Reasoning', version: 'Sonar-Pro', category: 'reasoning' },
    
    // Chinese AI Models
    { id: 'kimi', name: 'Kimi', version: 'Kimi-K2', category: 'general' },
    { id: 'kimi-large', name: 'Kimi Large', version: 'Kimi-large', category: 'powerful' },
    { id: 'kimi-reasoning', name: 'Kimi Reasoning', version: 'Kimi-reasoning', category: 'reasoning' },
    { id: 'glm', name: 'GLM', version: 'GLM-4.5-Air', category: 'general' },
    { id: 'minimax', name: 'MiniMax', version: 'M2.1', category: 'general' },
    
    // Grok Models
    { id: 'grok', name: 'Grok', version: 'Grok-4', category: 'general' },
    { id: 'grok-fast', name: 'Grok Fast', version: 'Grok-fast', category: 'fast' },
    
    // Amazon Nova
    { id: 'nova-fast', name: 'Nova Fast', version: 'Amazon-Nova', category: 'fast' },
    
    // Microsoft Phi
    { id: 'phi', name: 'Phi', version: 'Phi-4', category: 'general' },
    
    // Search/Tool Models
    { id: 'searchgpt', name: 'SearchGPT', version: 'v1', category: 'search' },
    
    // Creative/Art Models
    { id: 'midijourney', name: 'Midijourney', version: 'v1', category: 'creative' },
    { id: 'unity', name: 'Unity', version: 'v1', category: 'creative' },
    { id: 'rtist', name: 'Rtist', version: 'v1', category: 'creative' },
    
    // Special/Character Models
    { id: 'evil', name: 'Evil Mode', version: 'Uncensored', category: 'special' },
    { id: 'p1', name: 'P1', version: 'v1', category: 'special' },
    { id: 'hormoz', name: 'Hormoz', version: 'v1', category: 'special' },
    { id: 'sur', name: 'Sur', version: 'v1', category: 'special' },
    { id: 'bidara', name: 'Bidara', version: 'v1', category: 'special' },
    
    // Education/Utility Models
    { id: 'chickytutor', name: 'ChickyTutor', version: 'Education', category: 'education' },
    { id: 'nomnom', name: 'NomNom', version: 'Food', category: 'utility' }
];

const AI_PROVIDERS = {
    pollinations_free: {
        name: 'Pollinations (Free)',
        requiresKey: false,
        baseUrl: 'https://text.pollinations.ai',
        models: POLLINATIONS_MODELS,
        features: ['chat', 'streaming'],
        rateLimit: { requests: 10, per: 'minute' }
    },

    pollinations_api: {
        name: 'Pollinations (API)',
        requiresKey: true,
        baseUrl: 'https://text.pollinations.ai',
        models: POLLINATIONS_MODELS,
        features: ['chat', 'streaming'],
        rateLimit: { requests: 100, per: 'minute' }
    },

    gemini: {
        name: 'Google Gemini',
        requiresKey: true,
        models: [
            // GEMINI 3 - Latest
            { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro Preview', version: '3.0-pro', category: 'powerful' },
            { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash Preview', version: '3.0-flash', category: 'fast' },
            { id: 'gemini-3-pro', name: 'Gemini 3 Pro', version: '3-pro', category: 'powerful' },
            { id: 'gemini-3-flash', name: 'Gemini 3 Flash', version: '3-flash', category: 'fast' },
            
            // GEMINI 2.5
            { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', version: '2.5-pro', category: 'powerful' },
            { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', version: '2.5-flash', category: 'fast' },
            { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite', version: '2.5-lite', category: 'fast' },
            
            // GEMINI 2.0
            { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', version: '2.0-flash', category: 'fast' },
            
            // GEMINI LATEST
            { id: 'gemini-flash-latest', name: 'Gemini Flash Latest', version: 'latest', category: 'fast' },
            { id: 'gemini-pro-latest', name: 'Gemini Pro Latest', version: 'latest', category: 'powerful' },
            
            // GEMMA
            { id: 'gemma-3-27b-it', name: 'Gemma 3 27B', version: '27B', category: 'general' },
            { id: 'gemma-3-12b-it', name: 'Gemma 3 12B', version: '12B', category: 'general' },
            { id: 'gemma-3-4b-it', name: 'Gemma 3 4B', version: '4B', category: 'fast' },
            
            // SPECIAL
            { id: 'deep-research-pro-preview-12-2025', name: 'Deep Research Pro', version: 'research', category: 'reasoning' }
        ],
        features: ['chat', 'vision', 'function-calling', 'streaming'],
        rateLimit: { requests: 60, per: 'minute' }
    },

    groq: {
        name: 'Groq',
        requiresKey: true,
        models: [
            // LLAMA
            { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', version: 'v3.3', category: 'general' },
            { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B', version: 'v3.1', category: 'fast' },
            { id: 'meta-llama/llama-4-maverick-17b-128e-instruct', name: 'Llama 4 Maverick', version: '17B-128E', category: 'general' },
            { id: 'meta-llama/llama-4-scout-17b-16e-instruct', name: 'Llama 4 Scout', version: '17B-16E', category: 'general' },
            
            // GPT-OSS
            { id: 'openai/gpt-oss-120b', name: 'GPT OSS 120B', version: '120B', category: 'powerful' },
            { id: 'openai/gpt-oss-20b', name: 'GPT OSS 20B', version: '20B', category: 'general' },
            
            // MIXTRAL
            { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', version: '8x7B', category: 'general' },
            
            // GEMMA
            { id: 'gemma2-9b-it', name: 'Gemma 2 9B', version: '9B', category: 'general' },
            
            // QWEN
            { id: 'qwen/qwen3-32b', name: 'Qwen 3 32B', version: '32B', category: 'general' },
            
            // KIMI
            { id: 'moonshotai/kimi-k2-instruct-0905', name: 'Kimi K2', version: 'K2', category: 'general' },
            
            // LLAMA TOOL USE
            { id: 'llama-3-groq-70b-tool-use', name: 'Llama 3 70B Tool', version: '70B-tool', category: 'tool-use' },
            { id: 'llama-3-groq-8b-tool-use', name: 'Llama 3 8B Tool', version: '8B-tool', category: 'tool-use' }
        ],
        features: ['chat', 'tool-use', 'streaming'],
        rateLimit: { requests: 30, per: 'minute' }
    },

    openrouter: {
        name: 'OpenRouter',
        requiresKey: true,
        models: [
            // TRINITY
            { id: 'arcee-ai/trinity-large-preview:free', name: 'Trinity Large Preview', version: 'Large-400B', category: 'powerful', free: true },
            
            // STEP 3.5
            { id: 'stepfun/step-3.5-flash:free', name: 'Step 3.5 Flash', version: '3.5-Flash', category: 'fast', free: true },
            
            // SOLAR
            { id: 'upstage/solar-pro-3:free', name: 'Solar Pro 3', version: 'Pro-3', category: 'general', free: true },
            
            // LIQUID
            { id: 'liquid/lfm-2.5-1.2b-thinking:free', name: 'LFM2.5-1.2B-Thinking', version: '1.2B', category: 'reasoning', free: true },
            { id: 'liquid/lfm-2.5-1.2b-instruct:free', name: 'LFM2.5-1.2B-Instruct', version: '1.2B', category: 'general', free: true },
            
            // MOLMO
            { id: 'allenai/molmo-2-8b:free', name: 'Molmo2 8B', version: '8B', category: 'vision', free: true },
            
            // DEEPSEEK
            { id: 'tngtech/deepseek-r1t-chimera:free', name: 'R1T Chimera', version: 'R1T', category: 'reasoning', free: true },
            { id: 'tngtech/deepseek-r1t2-chimera:free', name: 'DeepSeek R1T2 Chimera', version: 'R1T2', category: 'reasoning', free: true },
            { id: 'deepseek/deepseek-r1-0528:free', name: 'R1 0528', version: '0528', category: 'reasoning', free: true },
            
            // GLM
            { id: 'z-ai/glm-4.5-air:free', name: 'GLM 4.5 Air', version: '4.5-Air', category: 'general', free: true },
            
            // UNCENSORED
            { id: 'cognitivecomputations/dolphin-mistral-24b-venice-edition:free', name: 'Uncensored', version: '24B', category: 'special', free: true },
            
            // GEMMA
            { id: 'google/gemma-3n-e2b-it:free', name: 'Gemma 3n 2B', version: '3n-2B', category: 'fast', free: true },
            
            // MISTRAL
            { id: 'mistralai/mistral-small-3.1-24b-instruct:free', name: 'Mistral Small 3.1 24B', version: '24B', category: 'general', free: true },
            
            // GEMINI
            { id: 'google/gemini-2.0-flash-exp:free', name: 'Gemini 2.0 Flash', version: '2.0-flash', category: 'fast', free: true },
            
            // LLAMA
            { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Llama 3.3 70B', version: '70B', category: 'general', free: true },
            { id: 'meta-llama/llama-3.1-405b-instruct:free', name: 'Llama 3.1 405B', version: '405B', category: 'powerful', free: true },
            
            // QWEN
            { id: 'qwen/qwen3-coder:free', name: 'Qwen3 Coder', version: 'Coder', category: 'coding', free: true },
            
            // KIMI
            { id: 'moonshotai/kimi-k2:free', name: 'Kimi K2', version: 'K2', category: 'general', free: true },
            
            // GPT-OSS
            { id: 'openai/gpt-oss-120b:free', name: 'GPT OSS 120B', version: '120B', category: 'powerful', free: true },
            
            // HERMES
            { id: 'nousresearch/hermes-3-llama-3.1-405b:free', name: 'Hermes 3 405B', version: '405B', category: 'powerful', free: true },
            
            // NVIDIA NEMOTRON
            { id: 'nvidia/nemotron-nano-9b-v2:free', name: 'Nemotron Nano 9B', version: '9B-v2', category: 'general', free: true }
        ],
        features: ['chat', 'streaming'],
        rateLimit: { requests: 200, per: 'minute' }
    },

    huggingface: {
        name: 'HuggingFace',
        requiresKey: true,
        models: [
            { id: 'meta-llama/Meta-Llama-3.1-8B-Instruct', name: 'Llama 3.1 8B', version: '3.1-8B', category: 'general' },
            { id: 'meta-llama/Llama-3.3-70B-Instruct', name: 'Llama 3.3 70B', version: '3.3-70B', category: 'powerful' },
            { id: 'HuggingFaceH4/zephyr-7b-beta', name: 'Zephyr 7B', version: '7B-beta', category: 'general' },
            { id: 'mistralai/Mistral-7B-Instruct-v0.1', name: 'Mistral 7B', version: '7B-v0.1', category: 'general' },
            { id: 'mistralai/Mixtral-8x7B-Instruct-v0.1', name: 'Mixtral 8x7B', version: '8x7B', category: 'powerful' },
            { id: 'google/flan-t5-large', name: 'Flan T5 Large', version: 'T5-large', category: 'general' },
            { id: 'EleutherAI/gpt-j-6B', name: 'GPT-J 6B', version: '6B', category: 'general' },
            { id: 'Qwen/Qwen2.5-72B-Instruct', name: 'Qwen 2.5 72B', version: '2.5-72B', category: 'powerful' },
            { id: 'google/gemma-2-27b-it', name: 'Gemma 2 27B', version: '2-27B', category: 'general' }
        ],
        features: ['chat', 'inference-api'],
        rateLimit: { requests: 100, per: 'hour' }
    }
};

// Helper functions
const getAllModels = () => {
    const allModels = [];
    for (const [providerId, provider] of Object.entries(AI_PROVIDERS)) {
        provider.models.forEach(model => {
            allModels.push({
                ...model,
                provider: providerId,
                providerName: provider.name
            });
        });
    }
    return allModels;
};

const getModelsByCategory = (category) => {
    return getAllModels().filter(model => model.category === category);
};

const getModelsByProvider = (providerId) => {
    return AI_PROVIDERS[providerId]?.models || [];
};

const findModel = (modelId, providerId = null) => {
    if (providerId) {
        return AI_PROVIDERS[providerId]?.models.find(m => m.id === modelId);
    }
    
    // Search all providers
    for (const provider of Object.values(AI_PROVIDERS)) {
        const model = provider.models.find(m => m.id === modelId);
        if (model) return model;
    }
    return null;
};

const getRecommendedModels = () => {
    return {
        fast: 'gemini-3-flash',
        balanced: 'gemini-3-pro',
        powerful: 'claude-opus',
        coding: 'openai-large',
        reasoning: 'deepseek-r1',
        free: 'gemini'
    };
};

module.exports = {
    AI_PROVIDERS,
    POLLINATIONS_MODELS,
    getAllModels,
    getModelsByCategory,
    getModelsByProvider,
    findModel,
    getRecommendedModels
};
