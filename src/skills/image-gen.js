// ==================== IMAGE GENERATION SKILL ====================
const axios = require('axios');
const { AttachmentBuilder } = require('discord.js');
const { createEmbed, createErrorEmbed, truncate } = require('../utils/helpers');
const logger = require('../services/logger');
const settings = require('../config/settings');
const STYLES = {
'realistic': 'photorealistic, highly detailed, 8k, professional photography',
'anime': 'anime style, manga art, studio ghibli inspired, vibrant colors',
'digital': 'digital art, concept art, artstation trending, detailed illustration',
'oil': 'oil painting, classical art style, renaissance, masterpiece',
'watercolor': 'watercolor painting, soft colors, artistic, traditional art',
'3d': '3D render, octane render, cinema 4D, highly detailed, realistic lighting',
'pixel': 'pixel art, 16-bit, retro game style, nostalgic',
'cartoon': 'cartoon style, disney pixar, colorful, fun',
'cyberpunk': 'cyberpunk, neon lights, futuristic, sci-fi, dystopian',
'fantasy': 'fantasy art, magical, epic, detailed environment'
};
const SIZES = {
'square': '1024x1024',
'portrait': '768x1024',
'landscape': '1024x768',
'wide': '1280x720'
};
class PollinationsImageService {
constructor() {
this.baseUrl = 'https://image.pollinations.ai/prompt';
}
async generate(prompt, options = {}) {
const { width = 1024, height = 1024, seed, nologo = true, enhance = true } = options;
const encodedPrompt = encodeURIComponent(prompt);
let url = `${this.baseUrl}/${encodedPrompt}?width=${width}&height=${height}&nologo=${nologo}&enhance=${enhance}`;
if (seed) url += `&seed=${seed}`;
const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 60000 });
return { buffer: Buffer.from(response.data), url };
}
}
class OpenAIImageService {
constructor() {
this.baseUrl = 'https://api.openai.com/v1/images/generations';
this.apiKey = process.env.OPENAI_API_KEY;
}
async generate(prompt, options = {}) {
if (!this.apiKey) throw new Error('OpenAI API key not configured');
const { size = '1024x1024', quality = 'standard', style = 'vivid' } = options;
const response = await axios.post(this.baseUrl, {
model: 'dall-e-3',
prompt,
n: 1,
size,
quality,
style
}, {
headers: { 'Authorization': `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
timeout: 60000
});
const imageUrl = response.data.data[0].url;
const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
return { buffer: Buffer.from(imageResponse.data), url: imageUrl, revisedPrompt: response.data.data[0].revised_prompt };
}
}
const pollinations = new PollinationsImageService();
const openai = new OpenAIImageService();
module.exports = {
name: 'imageGen',
description: 'Generate images from text prompts',
usage: '!img <prompt> [--style <style>] [--size <size>]',
cooldown: 10,
async execute(ctx, args) {
let prompt = ctx.options?.getString('prompt') || args.join(' ');
if (!prompt) {
const stylesInfo = Object.keys(STYLES).join(', ');
await ctx.reply({ embeds: [createErrorEmbed(`Please provide a prompt!\nUsage: \`!img <prompt>\`\n\nAvailable styles: ${stylesInfo}`)] });
return;
}
if (prompt.length > settings.imageGen.maxPromptLength) {
await ctx.reply({ embeds: [createErrorEmbed(`Prompt too long! Max ${settings.imageGen.maxPromptLength} characters.`)] });
return;
}
let style = ctx.options?.getString('style') || null;
let size = ctx.options?.getString('size') || 'square';
const styleMatch = prompt.match(/--style\s+(\w+)/i);
if (styleMatch) {
style = styleMatch[1].toLowerCase();
prompt = prompt.replace(/--style\s+\w+/i, '').trim();
}
const sizeMatch = prompt.match(/--size\s+(\w+)/i);
if (sizeMatch) {
size = sizeMatch[1].toLowerCase();
prompt = prompt.replace(/--size\s+\w+/i, '').trim();
}
if (style && STYLES[style]) {
prompt = `${prompt}, ${STYLES[style]}`;
}
const [width, height] = (SIZES[size] || SIZES.square).split('x').map(Number);
await ctx.deferReply?.() || ctx.channel?.sendTyping();
try {
let result;
let provider = 'Pollinations';
try {
result = await pollinations.generate(prompt, { width, height, seed: Math.floor(Math.random() * 1000000) });
} catch (pollinationError) {
logger.warn(`Pollinations failed, trying backup: ${pollinationError.message}`);
if (process.env.OPENAI_API_KEY) {
result = await openai.generate(prompt, { size: SIZES[size] });
provider = 'DALL-E 3';
} else {
throw pollinationError;
}
}
const attachment = new AttachmentBuilder(result.buffer, { name: 'generated.png' });
const embed = createEmbed({
title: '🎨 Image Generated',
description: `**Prompt:** ${truncate(prompt.split(',')[0], 200)}`,
color: settings.colors.primary,
image: 'attachment://generated.png',
footer: `Provider: ${provider} | Size: ${width}x${height}${style ? ` | Style: ${style}` : ''}`
});
if (result.revisedPrompt) {
embed.addFields({ name: 'Revised Prompt', value: truncate(result.revisedPrompt, 1000) });
}
await (ctx.editReply ? ctx.editReply({ embeds: [embed], files: [attachment] }) : ctx.reply({ embeds: [embed], files: [attachment] }));
} catch (error) {
logger.error(`Image generation error: ${error.message}`);
await (ctx.editReply ? ctx.editReply({ embeds: [createErrorEmbed(`Failed to generate image: ${error.message}`)] }) : ctx.reply({ embeds: [createErrorEmbed(`Failed to generate image: ${error.message}`)] }));
}
},
getStyles() {
return STYLES;
},
getSizes() {
return SIZES;
}
};
