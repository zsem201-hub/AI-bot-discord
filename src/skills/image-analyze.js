// ==================== IMAGE ANALYSIS SKILL ====================
const axios = require('axios');
const { createEmbed, createErrorEmbed, truncate } = require('../utils/helpers');
const aiManager = require('../ai/manager');
const logger = require('../services/logger');
const settings = require('../config/settings');
module.exports = {
name: 'imageAnalyze',
description: 'Analyze images using AI vision',
usage: '!analyze [prompt] (attach image or reply to image)',
cooldown: 5,
async execute(ctx, args) {
const prompt = ctx.options?.getString('prompt') || args.join(' ') || 'Describe this image in detail. What do you see?';
let imageUrl = null;
let imageBuffer = null;
const attachment = ctx.options?.getAttachment('image');
if (attachment && attachment.contentType?.startsWith('image/')) {
imageUrl = attachment.url;
}
if (!imageUrl && ctx.attachments?.size > 0) {
const img = ctx.attachments.find(a => a.contentType?.startsWith('image/'));
if (img) imageUrl = img.url;
}
if (!imageUrl && ctx.reference) {
try {
const repliedMessage = await ctx.channel.messages.fetch(ctx.reference.messageId);
if (repliedMessage.attachments?.size > 0) {
const img = repliedMessage.attachments.find(a => a.contentType?.startsWith('image/'));
if (img) imageUrl = img.url;
}
if (!imageUrl && repliedMessage.embeds?.length > 0) {
for (const embed of repliedMessage.embeds) {
if (embed.image?.url) { imageUrl = embed.image.url; break; }
if (embed.thumbnail?.url) { imageUrl = embed.thumbnail.url; break; }
}
}
} catch (e) {
logger.debug(`Could not fetch replied message: ${e.message}`);
}
}
if (!imageUrl) {
const messages = await ctx.channel.messages.fetch({ limit: 10 });
for (const msg of messages.values()) {
if (msg.attachments?.size > 0) {
const img = msg.attachments.find(a => a.contentType?.startsWith('image/'));
if (img) { imageUrl = img.url; break; }
}
if (msg.embeds?.length > 0) {
for (const embed of msg.embeds) {
if (embed.image?.url) { imageUrl = embed.image.url; break; }
}
if (imageUrl) break;
}
}
}
if (!imageUrl) {
await ctx.reply({ embeds: [createErrorEmbed('No image found!\n\n**How to use:**\n• Attach an image with the command\n• Reply to a message with an image\n• Use command after posting an image')] });
return;
}
await ctx.deferReply?.() || ctx.channel?.sendTyping();
try {
const result = await aiManager.analyzeImage({
imageUrl,
prompt,
userId: ctx.author?.id || ctx.user?.id,
model: 'gemini-3-pro'
});
const embed = createEmbed({
title: '🔍 Image Analysis',
description: truncate(result.text, 4000),
color: settings.colors.primary,
thumbnail: imageUrl,
footer: `Model: Gemini Vision | Tokens: ${result.tokens || 'N/A'}`
});
if (prompt !== 'Describe this image in detail. What do you see?') {
embed.addFields({ name: 'Query', value: truncate(prompt, 200) });
}
await (ctx.editReply ? ctx.editReply({ embeds: [embed] }) : ctx.reply({ embeds: [embed] }));
} catch (error) {
logger.error(`Image analysis error: ${error.message}`);
await (ctx.editReply ? ctx.editReply({ embeds: [createErrorEmbed(`Analysis failed: ${error.message}`)] }) : ctx.reply({ embeds: [createErrorEmbed(`Analysis failed: ${error.message}`)] }));
}
}
};
