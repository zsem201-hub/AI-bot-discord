// ==================== HELPER FUNCTIONS ====================
const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
function truncate(str, length = 2000) {
if (!str) return '';
if (str.length <= length) return str;
return str.substring(0, length - 3) + '...';
}
function formatNumber(num) {
return new Intl.NumberFormat('en-US').format(num);
}
function formatDuration(ms) {
const seconds = Math.floor(ms / 1000);
const minutes = Math.floor(seconds / 60);
const hours = Math.floor(minutes / 60);
const days = Math.floor(hours / 24);
if (days > 0) return `${days}d ${hours % 24}h`;
if (hours > 0) return `${hours}h ${minutes % 60}m`;
if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
return `${seconds}s`;
}
function formatBytes(bytes) {
if (bytes === 0) return '0 B';
const k = 1024;
const sizes = ['B', 'KB', 'MB', 'GB'];
const i = Math.floor(Math.log(bytes) / Math.log(k));
return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
function parseTime(timeStr) {
const regex = /^(\d+)(s|m|h|d|w)$/i;
const match = timeStr.match(regex);
if (!match) return null;
const value = parseInt(match[1]);
const unit = match[2].toLowerCase();
const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000, w: 604800000 };
return value * (multipliers[unit] || 0);
}
function sleep(ms) {
return new Promise(resolve => setTimeout(resolve, ms));
}
function randomInt(min, max) {
return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randomChoice(array) {
return array[Math.floor(Math.random() * array.length)];
}
function shuffleArray(array) {
const arr = [...array];
for (let i = arr.length - 1; i > 0; i--) {
const j = Math.floor(Math.random() * (i + 1));
[arr[i], arr[j]] = [arr[j], arr[i]];
}
return arr;
}
function escapeMarkdown(text) {
return text.replace(/([*_`~|\\])/g, '\\$1');
}
function escapeRegex(str) {
return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function createEmbed(options = {}) {
const embed = new EmbedBuilder();
if (options.title) embed.setTitle(options.title);
if (options.description) embed.setDescription(truncate(options.description, 4000));
if (options.color) embed.setColor(options.color);
if (options.footer) embed.setFooter({ text: options.footer });
if (options.thumbnail) embed.setThumbnail(options.thumbnail);
if (options.image) embed.setImage(options.image);
if (options.author) embed.setAuthor(options.author);
if (options.fields) embed.addFields(options.fields);
if (options.timestamp) embed.setTimestamp();
return embed;
}
function createErrorEmbed(message, title = '❌ Error') {
return createEmbed({
title,
description: message,
color: '#FF0000'
});
}
function createSuccessEmbed(message, title = '✅ Success') {
return createEmbed({
title,
description: message,
color: '#00FF00'
});
}
function createInfoEmbed(message, title = 'ℹ️ Info') {
return createEmbed({
title,
description: message,
color: '#0099FF'
});
}
function splitMessage(text, maxLength = 2000) {
if (text.length <= maxLength) return [text];
const chunks = [];
let current = '';
const lines = text.split('\n');
for (const line of lines) {
if (current.length + line.length + 1 > maxLength) {
if (current) chunks.push(current);
current = line;
} else {
current += (current ? '\n' : '') + line;
}
}
if (current) chunks.push(current);
return chunks;
}
function codeBlock(text, language = '') {
return `\`\`\`${language}\n${text}\n\`\`\``;
}
function inlineCode(text) {
return `\`${text}\``;
}
function bold(text) {
return `**${text}**`;
}
function italic(text) {
return `*${text}*`;
}
function strikethrough(text) {
return `~~${text}~~`;
}
function isValidUrl(string) {
try {
new URL(string);
return true;
} catch (_) {
return false;
}
}
function extractUrls(text) {
const urlRegex = /(https?:\/\/[^\s]+)/gi;
return text.match(urlRegex) || [];
}
function chunk(array, size) {
const chunks = [];
for (let i = 0; i < array.length; i += size) {
chunks.push(array.slice(i, i + size));
}
return chunks;
}
function debounce(func, wait) {
let timeout;
return function executedFunction(...args) {
const later = () => {
clearTimeout(timeout);
func(...args);
};
clearTimeout(timeout);
timeout = setTimeout(later, wait);
};
}
function throttle(func, limit) {
let inThrottle;
return function executedFunction(...args) {
if (!inThrottle) {
func(...args);
inThrottle = true;
setTimeout(() => inThrottle = false, limit);
}
};
}
async function retry(fn, retries = 3, delay = 1000) {
for (let i = 0; i < retries; i++) {
try {
return await fn();
} catch (error) {
if (i === retries - 1) throw error;
await sleep(delay * (i + 1));
}
}
}
function parseArgs(str) {
const args = [];
let current = '';
let inQuotes = false;
let quoteChar = '';
for (const char of str) {
if ((char === '"' || char === "'") && !inQuotes) {
inQuotes = true;
quoteChar = char;
} else if (char === quoteChar && inQuotes) {
inQuotes = false;
quoteChar = '';
} else if (char === ' ' && !inQuotes) {
if (current) {
args.push(current);
current = '';
}
} else {
current += char;
}
}
if (current) args.push(current);
return args;
}
module.exports = {
truncate, formatNumber, formatDuration, formatBytes, parseTime,
sleep, randomInt, randomChoice, shuffleArray,
escapeMarkdown, escapeRegex,
createEmbed, createErrorEmbed, createSuccessEmbed, createInfoEmbed,
splitMessage, codeBlock, inlineCode, bold, italic, strikethrough,
isValidUrl, extractUrls, chunk, debounce, throttle, retry, parseArgs
};
