// ==================== HUGGINGFACE PROVIDER ====================
const axios = require('axios');
const logger = require('../../services/logger');
class HuggingFaceProvider {
constructor() {
this.name = 'HuggingFace';
this.baseUrl = 'https://api-inference.huggingface.co/models';
this.supportedFeatures = ['chat'];
}
async chat({ message, model = 'meta-llama/Llama-3.3-70B-Instruct', context = [], systemPrompt = null, temperature = 0.7, maxTokens = 1000 }) {
try {
const prompt = this.buildPrompt(message, context, systemPrompt);
const response = await axios.post(`${this.baseUrl}/${model}`, {
inputs: prompt,
parameters: {
temperature,
max_new_tokens: maxTokens,
return_full_text: false,
do_sample: true
}
}, {
headers: {
'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
'Content-Type': 'application/json'
},
timeout: 60000
});
let text = '';
if (Array.isArray(response.data)) {
text = response.data[0]?.generated_text || '';
} else if (response.data.generated_text) {
text = response.data.generated_text;
} else {
text = JSON.stringify(response.data);
}
text = text.replace(prompt, '').trim();
return {
text,
tokens: this.estimateTokens(text),
model
};
} catch (error) {
if (error.response?.status === 503) {
throw new Error('Model is loading. Please try again in a few moments.');
}
logger.error(`HuggingFace error: ${error.message}`);
throw new Error(`HuggingFace API error: ${error.message}`);
}
}
buildPrompt(message, context, systemPrompt) {
let prompt = '';
if (systemPrompt) {
prompt += `System: ${systemPrompt}\n\n`;
}
for (const msg of context.slice(-10)) {
const role = msg.role === 'user' ? 'User' : 'Assistant';
prompt += `${role}: ${msg.content}\n\n`;
}
prompt += `User: ${message}\n\nAssistant:`;
return prompt;
}
estimateTokens(text) {
return Math.ceil(text.length / 4);
}
async healthCheck() {
try {
const response = await axios.get('https://huggingface.co/api/models/meta-llama/Llama-3.3-70B-Instruct', {
timeout: 5000
});
return response.status === 200;
} catch (error) {
return false;
}
}
getModels() {
return [
'meta-llama/Llama-3.3-70B-Instruct',
'mistralai/Mistral-7B-Instruct-v0.1',
'google/gemma-2-27b-it'
];
}
}
module.exports = new HuggingFaceProvider();
