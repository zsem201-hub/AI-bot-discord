// ==================== POLLINATIONS PROVIDER ====================
const axios = require('axios');
const logger = require('../../services/logger');
class PollinationsProvider {
constructor() {
this.name = 'Pollinations';
this.baseUrl = 'https://text.pollinations.ai';
this.supportedFeatures = ['chat', 'streaming'];
}
async chat({ message, model = 'openai', context = [], systemPrompt = null, temperature = 0.7 }) {
try {
const messages = this.formatMessages(context, systemPrompt);
messages.push({ role: 'user', content: message });
const useApi = !!process.env.POLLINATIONS_API_KEY;
const url = useApi ? `${this.baseUrl}` : `${this.baseUrl}`;
const response = await axios.post(url, {
messages,
model,
temperature,
seed: Math.floor(Math.random() * 1000000),
jsonMode: false
}, {
headers: useApi ? {
'Authorization': `Bearer ${process.env.POLLINATIONS_API_KEY}`,
'Content-Type': 'application/json'
} : { 'Content-Type': 'application/json' },
timeout: 30000
});
const text = typeof response.data === 'string' ? response.data : response.data.text || response.data.message || JSON.stringify(response.data);
return {
text,
tokens: this.estimateTokens(text),
model
};
} catch (error) {
if (error.response?.status === 429) {
throw new Error('Rate limit exceeded. Please try again later.');
}
logger.error(`Pollinations error: ${error.message}`);
throw new Error(`Pollinations API error: ${error.message}`);
}
}
async *chatStream({ message, model = 'openai', context = [], systemPrompt = null }) {
try {
const messages = this.formatMessages(context, systemPrompt);
messages.push({ role: 'user', content: message });
const useApi = !!process.env.POLLINATIONS_API_KEY;
const response = await axios.post(`${this.baseUrl}`, {
messages,
model,
stream: true
}, {
headers: useApi ? { 'Authorization': `Bearer ${process.env.POLLINATIONS_API_KEY}` } : {},
responseType: 'stream',
timeout: 60000
});
for await (const chunk of response.data) {
const text = chunk.toString();
if (text.trim()) {
yield text;
}
}
} catch (error) {
logger.error(`Pollinations stream error: ${error.message}`);
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
const response = await axios.post(this.baseUrl, {
messages: [{ role: 'user', content: 'test' }],
model: 'openai'
}, { timeout: 5000 });
return response.status === 200;
} catch (error) {
return false;
}
}
getModels() {
return [
'openai', 'openai-fast', 'openai-large', 'openai-reasoning',
'claude', 'claude-fast', 'claude-opus', 'claude-sonnet',
'gemini', 'gemini-fast', 'gemini-large', 'gemini-thinking',
'deepseek', 'deepseek-r1', 'llama', 'llama-4', 'mistral',
'qwen', 'qwen-coder', 'grok', 'phi', 'searchgpt'
];
}
}
module.exports = new PollinationsProvider();
