// ==================== OPENROUTER PROVIDER ====================
const axios = require('axios');
const logger = require('../../services/logger');
class OpenRouterProvider {
constructor() {
this.name = 'OpenRouter';
this.baseUrl = 'https://openrouter.ai/api/v1';
this.supportedFeatures = ['chat', 'streaming'];
}
async chat({ message, model = 'google/gemini-2.0-flash-exp:free', context = [], systemPrompt = null, temperature = 0.7, maxTokens = 2000 }) {
try {
const messages = this.formatMessages(context, systemPrompt);
messages.push({ role: 'user', content: message });
const response = await axios.post(`${this.baseUrl}/chat/completions`, {
model,
messages,
temperature,
max_tokens: maxTokens
}, {
headers: {
'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
'HTTP-Referer': 'https://github.com/your-repo',
'X-Title': 'Discord AI Bot',
'Content-Type': 'application/json'
},
timeout: 60000
});
const text = response.data.choices[0]?.message?.content || '';
return {
text,
tokens: response.data.usage?.total_tokens || this.estimateTokens(text),
model
};
} catch (error) {
logger.error(`OpenRouter error: ${error.message}`);
throw new Error(`OpenRouter API error: ${error.message}`);
}
}
async *chatStream({ message, model = 'google/gemini-2.0-flash-exp:free', context = [], systemPrompt = null }) {
try {
const messages = this.formatMessages(context, systemPrompt);
messages.push({ role: 'user', content: message });
const response = await axios.post(`${this.baseUrl}/chat/completions`, {
model,
messages,
stream: true
}, {
headers: {
'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
'HTTP-Referer': 'https://github.com/your-repo',
'X-Title': 'Discord AI Bot'
},
responseType: 'stream',
timeout: 60000
});
for await (const chunk of response.data) {
const lines = chunk.toString().split('\n').filter(line => line.trim() !== '');
for (const line of lines) {
if (line.startsWith('data: ')) {
const data = line.slice(6);
if (data === '[DONE]') continue;
try {
const parsed = JSON.parse(data);
const content = parsed.choices[0]?.delta?.content || '';
if (content) yield content;
} catch (e) {}
}
}
}
} catch (error) {
logger.error(`OpenRouter stream error: ${error.message}`);
throw error;
}
}
formatMessages(context, systemPrompt) {
const messages = [];
if (systemPrompt) {
messages.push({ role: 'system', content: systemPrompt });
}
for (const msg of context) {
messages.push({
role: msg.role === 'assistant' ? 'assistant' : 'user',
content: msg.content
});
}
return messages;
}
estimateTokens(text) {
return Math.ceil(text.length / 4);
}
async healthCheck() {
try {
const response = await axios.get(`${this.baseUrl}/models`, {
headers: { 'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}` },
timeout: 5000
});
return response.status === 200;
} catch (error) {
return false;
}
}
getModels() {
return [
'google/gemini-2.0-flash-exp:free', 'meta-llama/llama-3.3-70b-instruct:free',
'deepseek/deepseek-r1-0528:free', 'qwen/qwen3-coder:free',
'mistralai/mistral-small-3.1-24b-instruct:free'
];
}
}
module.exports = new OpenRouterProvider();
