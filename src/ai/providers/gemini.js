// ==================== GEMINI PROVIDER ====================
const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('../../services/logger');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
class GeminiProvider {
constructor() {
this.name = 'Google Gemini';
this.supportedFeatures = ['chat', 'vision', 'function-calling', 'streaming'];
}
async chat({ message, model = 'gemini-3-flash', context = [], systemPrompt = null, temperature = 0.7, maxTokens = 2000 }) {
try {
const modelInstance = genAI.getGenerativeModel({ 
model: this.normalizeModelName(model),
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
model,
finishReason: response.candidates?.[0]?.finishReason
};
} catch (error) {
logger.error(`Gemini error: ${error.message}`);
throw new Error(`Gemini API error: ${error.message}`);
}
}
async *chatStream({ message, model = 'gemini-3-flash', context = [], systemPrompt = null }) {
try {
const modelInstance = genAI.getGenerativeModel({ 
model: this.normalizeModelName(model)
});
const history = this.formatContext(context, systemPrompt);
const chat = modelInstance.startChat({ history });
const result = await chat.sendMessageStream(message);
for await (const chunk of result.stream) {
const chunkText = chunk.text();
yield chunkText;
}
} catch (error) {
logger.error(`Gemini stream error: ${error.message}`);
throw error;
}
}
async analyzeImage({ imageUrl, imageBuffer, prompt = 'Describe this image', model = 'gemini-3-pro' }) {
try {
const modelInstance = genAI.getGenerativeModel({ 
model: this.normalizeModelName(model)
});
let imagePart;
if (imageBuffer) {
imagePart = {
inlineData: {
data: imageBuffer.toString('base64'),
mimeType: 'image/jpeg'
}
};
} else if (imageUrl) {
const axios = require('axios');
const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
imagePart = {
inlineData: {
data: Buffer.from(response.data).toString('base64'),
mimeType: response.headers['content-type'] || 'image/jpeg'
}
};
} else {
throw new Error('Either imageUrl or imageBuffer must be provided');
}
const result = await modelInstance.generateContent([prompt, imagePart]);
const text = result.response.text();
return {
text,
tokens: this.estimateTokens(text)
};
} catch (error) {
logger.error(`Gemini vision error: ${error.message}`);
throw error;
}
}
async chatWithTools({ message, model = 'gemini-3-pro', context = [], tools = [] }) {
try {
const modelInstance = genAI.getGenerativeModel({
model: this.normalizeModelName(model),
tools: this.formatTools(tools)
});
const history = this.formatContext(context);
const chat = modelInstance.startChat({ history });
const result = await chat.sendMessage(message);
const response = result.response;
const functionCalls = response.functionCalls();
if (functionCalls && functionCalls.length > 0) {
return {
text: null,
functionCalls: functionCalls.map(fc => ({
name: fc.name,
arguments: fc.args
})),
requiresToolExecution: true
};
}
const text = response.text();
return {
text,
tokens: this.estimateTokens(text),
functionCalls: null,
requiresToolExecution: false
};
} catch (error) {
logger.error(`Gemini tools error: ${error.message}`);
throw error;
}
}
async sendFunctionResponse({ chat, functionName, functionResponse }) {
try {
const result = await chat.sendMessage([{
functionResponse: {
name: functionName,
response: functionResponse
}
}]);
return {
text: result.response.text(),
tokens: this.estimateTokens(result.response.text())
};
} catch (error) {
logger.error(`Function response error: ${error.message}`);
throw error;
}
}
formatContext(context, systemPrompt = null) {
const history = [];
if (systemPrompt) {
history.push({
role: 'user',
parts: [{ text: `System: ${systemPrompt}` }]
});
history.push({
role: 'model',
parts: [{ text: 'Understood. I will follow these instructions.' }]
});
}
for (const msg of context) {
history.push({
role: msg.role === 'assistant' ? 'model' : 'user',
parts: [{ text: msg.content }]
});
}
return history;
}
formatTools(tools) {
return tools.map(tool => ({
functionDeclarations: [{
name: tool.name,
description: tool.description,
parameters: tool.parameters
}]
}));
}
normalizeModelName(model) {
const modelMap = {
'gemini-3-pro': 'gemini-3-pro',
'gemini-3-flash': 'gemini-3-flash',
'gemini-3-pro-preview': 'gemini-3-pro-preview',
'gemini-3-flash-preview': 'gemini-3-flash-preview',
'gemini-2.5-pro': 'gemini-2.5-pro-latest',
'gemini-2.5-flash': 'gemini-2.5-flash-latest',
'gemini-2.0-flash': 'gemini-2.0-flash-exp',
'gemini-flash-latest': 'gemini-flash-latest',
'gemini-pro-latest': 'gemini-pro-latest',
'gemma-3-27b-it': 'gemma-3-27b-it',
'gemma-3-12b-it': 'gemma-3-12b-it',
'gemma-3-4b-it': 'gemma-3-4b-it'
};
return modelMap[model] || model;
}
estimateTokens(text) {
return Math.ceil(text.length / 4);
}
async healthCheck() {
try {
const model = genAI.getGenerativeModel({ model: 'gemini-3-flash' });
const result = await model.generateContent('test');
return result.response.text().length > 0;
} catch (error) {
return false;
}
}
getModels() {
return [
'gemini-3-pro', 'gemini-3-flash', 'gemini-2.5-pro', 'gemini-2.5-flash',
'gemini-2.0-flash', 'gemma-3-27b-it', 'gemma-3-12b-it', 'gemma-3-4b-it'
];
}
}
module.exports = new GeminiProvider();
