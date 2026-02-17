// ==================== GEMINI PROVIDER (FIXED) ====================
const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('../../services/logger');

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

class GeminiProvider {
    constructor() {
        this.name = 'Google Gemini';
        this.supportedFeatures = ['chat', 'vision', 'function-calling', 'streaming'];
    }

    normalizeModelName(model) {
        const modelMap = {
            // FIX: Map old/wrong names to valid ones
            'gemini-3-flash': 'gemini-2.0-flash-exp', // Fallback karena v3 belum ada
            'gemini-3-pro': 'gemini-1.5-pro-latest',
            
            // Valid models
            'gemini-2.0-flash': 'gemini-2.0-flash-exp',
            'gemini-2.0-flash-exp': 'gemini-2.0-flash-exp',
            'gemini-1.5-pro': 'gemini-1.5-pro-latest',
            'gemini-1.5-flash': 'gemini-1.5-flash-latest',
            'gemini-pro': 'gemini-1.5-pro-latest',
            'gemini-flash': 'gemini-1.5-flash-latest'
        };
        return modelMap[model] || 'gemini-2.0-flash-exp';
    }

    async chat({ message, model = 'gemini-2.0-flash-exp', context = [], systemPrompt = null, temperature = 0.7, maxTokens = 2000 }) {
        try {
            const validModel = this.normalizeModelName(model);
            const modelInstance = genAI.getGenerativeModel({ 
                model: validModel,
                generationConfig: {
                    temperature,
                    maxOutputTokens: maxTokens,
                    topP: 0.8,
                    topK: 40
                }
            });

            const history = this.formatContext(context, systemPrompt);
            const chat = modelInstance.startChat({ history });
            
            const result = await chat.sendMessage(message);
            const response = result.response;
            const text = response.text();

            return {
                text,
                tokens: this.estimateTokens(text),
                model: validModel,
                finishReason: response.candidates?.[0]?.finishReason
            };
        } catch (error) {
            logger.error(`Gemini error (${model}): ${error.message}`);
            // Jangan throw error, return text error agar bot tidak crash
            return {
                text: `⚠️ Maaf, terjadi error dengan model Gemini. Coba gunakan model lain (!m list). Error: ${error.message}`,
                tokens: 0
            };
        }
    }

    // ... methods lain tetap sama ...
    
    async *chatStream({ message, model = 'gemini-2.0-flash-exp', context = [], systemPrompt = null }) {
        try {
            const validModel = this.normalizeModelName(model);
            const modelInstance = genAI.getGenerativeModel({ model: validModel });
            const history = this.formatContext(context, systemPrompt);
            const chat = modelInstance.startChat({ history });
            const result = await chat.sendMessageStream(message);
            
            for await (const chunk of result.stream) {
                const chunkText = chunk.text();
                yield chunkText;
            }
        } catch (error) {
            logger.error(`Gemini stream error: ${error.message}`);
            yield `Error: ${error.message}`;
        }
    }

    formatContext(context, systemPrompt = null) {
        const history = [];
        if (systemPrompt) {
            history.push({
                role: 'user',
                parts: [{ text: `System Prompt: ${systemPrompt}` }]
            });
            history.push({
                role: 'model',
                parts: [{ text: 'Understood. I will follow these instructions.' }]
            });
        }
        for (const msg of context) {
            // Gemini roles: 'user' or 'model'
            const role = msg.role === 'assistant' ? 'model' : 'user';
            // Pastikan content ada
            if (msg.content) {
                history.push({
                    role: role,
                    parts: [{ text: msg.content }]
                });
            }
        }
        return history;
    }

    estimateTokens(text) {
        return Math.ceil(text.length / 4);
    }

    getModels() {
        return [
            'gemini-2.0-flash-exp', 
            'gemini-1.5-pro', 
            'gemini-1.5-flash'
        ];
    }
}

module.exports = new GeminiProvider();
