// ==================== SCREENSHOT SKILL ====================
const axios = require('axios');
const { AttachmentBuilder } = require('discord.js');
const { createEmbed, createErrorEmbed, isValidUrl } = require('../utils/helpers');
const logger = require('../services/logger');
const settings = require('../config/settings');
class ScreenshotService {
async capture(url, options = {}) {
const { width = 1280, height = 720, fullPage = false, delay = 0 } = options;
const apiUrl = `https://api.screenshotone.com/take`;
const params = {
url,
viewport_width: width,
viewport_height: height,
full_page: fullPage,
delay,
format: 'png',
access_key: process.env.SCREENSHOT_API_KEY || 'free'
};
if (!process.env.SCREENSHOT_API_KEY) {
return this.captureFreeFallback(url);
}
const response = await axios.get(apiUrl, { params, responseType: 'arraybuffer', timeout: 30000 });
return Buffer.from(response.data);
}
async captureFreeFallback(url) {
const encodedUrl = encodeURIComponent(url);
const apiUrl = `https://image.thum.io/get/width/1280/crop/720/noanimate/${encodedUrl}`;
const response = await axios.get(apiUrl, { responseType: 'arraybuffer', timeout: 30000 });
return Buffer.from(response.data);
}
}
const screenshotService = new ScreenshotService();
module.exports = {
name: 'screenshot',
description: 'Capture screenshot of a website',
usage: '!ss <url>',
cooldown: 10,
async execute(ctx, args) {
let url = ctx.options?.getString('url') || args[0];
const fullPage = ctx.options?.getBoolean('fullpage') || args.includes('--full');
if (!url) {
await ctx.reply({ embeds: [createErrorEmbed('Please provide a URL!\nUsage: `!ss <url>`\n\nExample: `!ss https://google.com`')] });
return;
}
if (!url.startsWith('http://') && !url.startsWith('https://')) {
url = 'https://' + url;
}
if (!isValidUrl(url)) {
await ctx.reply({ embeds: [createErrorEmbed('Invalid URL!')] });
return;
}
const blockedDomains = ['localhost', '127.0.0.1', '0.0.0.0', '192.168.', '10.', '172.'];
if (blockedDomains.some(d => url.includes(d))) {
await ctx.reply({ embeds: [createErrorEmbed('Cannot screenshot local/private addresses!')] });
return;
}
await ctx.deferReply?.() || ctx.channel?.sendTyping();
try {
const buffer = await screenshotService.capture(url, { fullPage });
const attachment = new AttachmentBuilder(buffer, { name: 'screenshot.png' });
const embed = createEmbed({
title: '📸 Screenshot Captured',
description: `**URL:** ${url.substring(0, 100)}${url.length > 100 ? '...' : ''}`,
color: settings.colors.success,
image: 'attachment://screenshot.png',
footer: `Requested by ${ctx.author?.username || ctx.user?.username}`
});
await (ctx.editReply ? ctx.editReply({ embeds: [embed], files: [attachment] }) : ctx.reply({ embeds: [embed], files: [attachment] }));
} catch (error) {
logger.error(`Screenshot error: ${error.message}`);
await (ctx.editReply ? ctx.editReply({ embeds: [createErrorEmbed(`Screenshot failed: ${error.message}`)] }) : ctx.reply({ embeds: [createErrorEmbed(`Screenshot failed: ${error.message}`)] }));
}
}
};
