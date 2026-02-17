// ==================== DOWNLOADER SKILL ====================
const axios = require('axios');
const { AttachmentBuilder } = require('discord.js');
const { createEmbed, createErrorEmbed, truncate } = require('../utils/helpers');
const logger = require('../services/logger');
const settings = require('../config/settings');
const SUPPORTED_PLATFORMS = {
youtube: /(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/,
tiktok: /(?:tiktok\.com\/@[\w.-]+\/video\/|vm\.tiktok\.com\/)(\d+)/,
instagram: /(?:instagram\.com\/(?:p|reel|reels)\/)([\w-]+)/,
twitter: /(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/,
facebook: /(?:facebook\.com|fb\.watch)\/(?:watch\/\?v=)?(\d+)/
};
class DownloaderService {
async download(url, type = 'video') {
const platform = this.detectPlatform(url);
if (!platform) throw new Error('Unsupported platform');
const apiUrl = `https://api.cobalt.tools/api/json`;
const response = await axios.post(apiUrl, {
url,
vCodec: 'h264',
vQuality: '720',
aFormat: type === 'audio' ? 'mp3' : 'best',
isAudioOnly: type === 'audio',
isNoTTWatermark: true,
isTTFullAudio: true
}, {
headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
timeout: 30000
});
if (response.data.status === 'error') {
throw new Error(response.data.text || 'Download failed');
}
return {
url: response.data.url,
filename: response.data.filename || `download.${type === 'audio' ? 'mp3' : 'mp4'}`,
platform
};
}
detectPlatform(url) {
for (const [platform, regex] of Object.entries(SUPPORTED_PLATFORMS)) {
if (regex.test(url)) return platform;
}
return null;
}
async getBuffer(url) {
const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 60000 });
return Buffer.from(response.data);
}
}
const downloader = new DownloaderService();
module.exports = {
name: 'downloader',
description: 'Download videos/audio from social media',
usage: '!download <url> [audio]',
cooldown: 15,
async execute(ctx, args) {
let url = ctx.options?.getString('url') || args[0];
let type = ctx.options?.getString('type') || (args[1] === 'audio' ? 'audio' : 'video');
if (!url) {
const embed = createEmbed({
title: '📥 Downloader Help',
description: 'Download videos/audio from social media',
color: settings.colors.info,
fields: [
{ name: 'Usage', value: '`!download <url>`\n`!download <url> audio`' },
{ name: 'Supported', value: '• YouTube (video & shorts)\n• TikTok\n• Instagram (post & reels)\n• Twitter/X\n• Facebook' },
{ name: 'Examples', value: '`!download https://youtu.be/xxxxx`\n`!download https://tiktok.com/... audio`' }
]
});
await ctx.reply({ embeds: [embed] });
return;
}
const platform = downloader.detectPlatform(url);
if (!platform) {
await ctx.reply({ embeds: [createErrorEmbed('Unsupported URL!\n\nSupported: YouTube, TikTok, Instagram, Twitter, Facebook')] });
return;
}
await ctx.deferReply?.() || ctx.channel?.sendTyping();
try {
const result = await downloader.download(url, type);
const buffer = await downloader.getBuffer(result.url);
if (buffer.length > 25 * 1024 * 1024) {
const embed = createEmbed({
title: '📥 Download Ready',
description: `File too large for Discord (${Math.round(buffer.length / 1024 / 1024)}MB)\n\n[Click here to download](${result.url})`,
color: settings.colors.primary,
footer: `Platform: ${platform} | Type: ${type}`
});
await (ctx.editReply ? ctx.editReply({ embeds: [embed] }) : ctx.reply({ embeds: [embed] }));
return;
}
const attachment = new AttachmentBuilder(buffer, { name: result.filename });
const embed = createEmbed({
title: `📥 Downloaded from ${platform.charAt(0).toUpperCase() + platform.slice(1)}`,
color: settings.colors.success,
footer: `Type: ${type} | Size: ${Math.round(buffer.length / 1024 / 1024 * 100) / 100}MB`
});
await (ctx.editReply ? ctx.editReply({ embeds: [embed], files: [attachment] }) : ctx.reply({ embeds: [embed], files: [attachment] }));
} catch (error) {
logger.error(`Download error: ${error.message}`);
await (ctx.editReply ? ctx.editReply({ embeds: [createErrorEmbed(`Download failed: ${error.message}`)] }) : ctx.reply({ embeds: [createErrorEmbed(`Download failed: ${error.message}`)] }));
}
}
};
