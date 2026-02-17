// ==================== GROQ PROVIDER ====================
const Groq = require('groq-sdk');
const logger = require('../../services/logger');
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
class GroqProvider {
constructor() {
this.name = 'Groq';
this.supportedFeatures = ['chat', 'streaming', 'tool-use'];
}
async chat({ message, model = 'llama-3.3-70b-versatile', context = [], systemPrompt = null, temperature = 0.7, maxTokens = 2000 }) {
try {
const messages = this.formatMessages(context, systemPrompt);
messages.push({ role: 'user', content: message });
const completion = await groq.chat.completions.create({
messages,
model,
temperature,
max_tokens: maxTokens,
top_p: 0.9,
stream: false
});
const text = completion.choices[0]?.message?.content || '';
return {
text,
tokens: completion.usage?.total_tokens || this.estimateTokens(text),
model,
finishReason: completion.choices[0]?.finish_reason
};
} catch (error) {
logger.error(`Groq error: ${error.message}`);
throw new Error(`Groq API error: ${error.message}`);
}
}
async *chatStream({ message, model = 'llama-3.3-70b-versatile', context = [], systemPrompt = null }) {
try {
const messages = this.formatMessages(context, systemPrompt);
messages.push({ role: 'user', content: message });
const stream = await groq.chat.completions.create({
messages,
model,
stream: true
});
for await (const chunk of stream) {
const content = chunk.choices[0]?.delta?.content || '';
if (content) {
yield content;
}
}
} catch (error) {
logger.error(`Groq stream error: ${error.message}`);
throw error;
}
}
async chatWithTools({ message, model = 'llama-3-groq-70b-tool-use', context = [], tools = [] }) {
try {
const messages = this.formatMessages(context);
messages.push({ role: 'user', content: message });
const completion = await groq.chat.completions.create({
messages,
model,
tools: this.formatTools(tools),
tool_choice: 'auto'
});
const choice = completion.choices[0];
if (choice.message.tool_calls) {
return {
text: null,
toolCalls: choice.message.tool_calls.map(tc => ({
name: tc.function.name,
arguments: JSON.parse(tc.function.arguments)
})),
requiresToolExecution: true
};
}
return {
text: choice.message.content,
tokens: completion.usage?.total_tokens,
toolCalls: null,
requiresToolExecution: false
};
} catch (error) {
logger.error(`Groq tools error: ${error.message}`);
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
formatTools(tools) {
return tools.map(tool => ({
type: 'function',
function: {
name: tool.name,
description: tool.description,
parameters: tool.parameters
}
}));
}
estimateTokens(text) {
return Math.ceil(text.length / 4);
}
async healthCheck() {
try {
const completion = await groq.chat.completions.create({
messages: [{ role: 'user', content: 'test' }],
model: 'llama-3.3-70b-versatile',
max_tokens: 10
});
return completion.choices.length > 0;
} catch (error) {
return false;
}
}
getModels() {
return [
'llama-3.3-70b-versatile', 'llama-3.1-8b-instant',
'meta-llama/llama-4-scout-17b-16e-instruct',
'mixtral-8x7b-32768', 'gemma2-9b-it'
];
}
}
module.exports = new GroqProvider();
