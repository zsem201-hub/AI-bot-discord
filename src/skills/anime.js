// ==================== ANIME SKILL ====================
const axios = require('axios');
const { createEmbed, createErrorEmbed, truncate } = require('../utils/helpers');
const logger = require('../services/logger');
const settings = require('../config/settings');
class AnimeService {
constructor() {
this.baseUrl = 'https://api.jikan.moe/v4';
}
async search(query) {
const response = await axios.get(`${this.baseUrl}/anime`, {
params: { q: query, limit: 1, sfw: true },
timeout: 10000
});
return response.data.data[0];
}
async getById(id) {
const response = await axios.get(`${this.baseUrl}/anime/${id}/full`, { timeout: 10000 });
return response.data.data;
}
async getTop(limit = 10, filter = 'bypopularity') {
const response = await axios.get(`${this.baseUrl}/top/anime`, {
params: { limit, filter },
timeout: 10000
});
return response.data.data;
}
async getSeasonal() {
const response = await axios.get(`${this.baseUrl}/seasons/now`, {
params: { limit: 10 },
timeout: 10000
});
return response.data.data;
}
async getRandom() {
const response = await axios.get(`${this.baseUrl}/random/anime`, { timeout: 10000 });
return response.data.data;
}
async searchManga(query) {
const response = await axios.get(`${this.baseUrl}/manga`, {
params: { q: query, limit: 1, sfw: true },
timeout: 10000
});
return response.data.data[0];
}
async getCharacter(query) {
const response = await axios.get(`${this.baseUrl}/characters`, {
params: { q: query, limit: 1 },
timeout: 10000
});
return response.data.data[0];
}
}
const animeService = new AnimeService();
module.exports = {
name: 'anime',
description: 'Search anime information from MyAnimeList',
usage: '!anime <title>',
cooldown: 5,
async execute(ctx, args) {
const subcommand = ctx.options?.getSubcommand?.() || args[0]?.toLowerCase();
const query = ctx.options?.getString('query') || args.slice(subcommand && ['top', 'seasonal', 'random', 'manga', 'character'].includes(subcommand) ? 1 : 0).join(' ');
if (subcommand === 'top') {
await ctx.deferReply?.() || ctx.channel?.sendTyping();
try {
const topAnime = await animeService.getTop(10);
let description = '';
for (let i = 0; i < topAnime.length; i++) {
const anime = topAnime[i];
description += `**${i + 1}. [${anime.title}](${anime.url})**\n`;
description += `⭐ ${anime.score || 'N/A'} | 📺 ${anime.episodes || '?'} eps | ${anime.status}\n\n`;
}
const embed = createEmbed({ title: '🏆 Top 10 Anime', description, color: '#2E51A2', thumbnail: topAnime[0]?.images?.jpg?.image_url, footer: 'Source: MyAnimeList' });
await (ctx.editReply ? ctx.editReply({ embeds: [embed] }) : ctx.reply({ embeds: [embed] }));
return;
} catch (error) {
logger.error(`Anime top error: ${error.message}`);
await (ctx.editReply ? ctx.editReply({ embeds: [createErrorEmbed(`Failed: ${error.message}`)] }) : ctx.reply({ embeds: [createErrorEmbed(`Failed: ${error.message}`)] }));
return;
}
}
if (subcommand === 'seasonal') {
await ctx.deferReply?.() || ctx.channel?.sendTyping();
try {
const seasonal = await animeService.getSeasonal();
let description = '';
for (const anime of seasonal.slice(0, 10)) {
description += `**[${anime.title}](${anime.url})**\n`;
description += `⭐ ${anime.score || 'N/A'} | 📺 ${anime.episodes || '?'} eps | ${anime.broadcast?.string || 'TBA'}\n\n`;
}
const embed = createEmbed({ title: '📅 This Season\'s Anime', description, color: '#2E51A2', footer: 'Source: MyAnimeList' });
await (ctx.editReply ? ctx.editReply({ embeds: [embed] }) : ctx.reply({ embeds: [embed] }));
return;
} catch (error) {
logger.error(`Anime seasonal error: ${error.message}`);
await (ctx.editReply ? ctx.editReply({ embeds: [createErrorEmbed(`Failed: ${error.message}`)] }) : ctx.reply({ embeds: [createErrorEmbed(`Failed: ${error.message}`)] }));
return;
}
}
if (subcommand === 'random') {
await ctx.deferReply?.() || ctx.channel?.sendTyping();
try {
const anime = await animeService.getRandom();
const embed = this.buildAnimeEmbed(anime);
embed.setTitle('🎲 Random Anime: ' + anime.title);
await (ctx.editReply ? ctx.editReply({ embeds: [embed] }) : ctx.reply({ embeds: [embed] }));
return;
} catch (error) {
logger.error(`Anime random error: ${error.message}`);
await (ctx.editReply ? ctx.editReply({ embeds: [createErrorEmbed(`Failed: ${error.message}`)] }) : ctx.reply({ embeds: [createErrorEmbed(`Failed: ${error.message}`)] }));
return;
}
}
if (!query) {
const embed = createEmbed({
title: '🎌 Anime Search Help',
color: '#2E51A2',
fields: [
{ name: 'Search Anime', value: '`!anime <title>`' },
{ name: 'Top Anime', value: '`!anime top`' },
{ name: 'This Season', value: '`!anime seasonal`' },
{ name: 'Random', value: '`!anime random`' },
{ name: 'Examples', value: '`!anime Naruto`\n`!anime Attack on Titan`\n`!anime top`' }
]
});
await ctx.reply({ embeds: [embed] });
return;
}
await ctx.deferReply?.() || ctx.channel?.sendTyping();
try {
const anime = await animeService.search(query);
if (!anime) {
await (ctx.editReply ? ctx.editReply({ embeds: [createErrorEmbed(`No anime found for "${query}"`)] }) : ctx.reply({ embeds: [createErrorEmbed(`No anime found for "${query}"`)] }));
return;
}
const embed = this.buildAnimeEmbed(anime);
await (ctx.editReply ? ctx.editReply({ embeds: [embed] }) : ctx.reply({ embeds: [embed] }));
} catch (error) {
logger.error(`Anime search error: ${error.message}`);
await (ctx.editReply ? ctx.editReply({ embeds: [createErrorEmbed(`Failed: ${error.message}`)] }) : ctx.reply({ embeds: [createErrorEmbed(`Failed: ${error.message}`)] }));
}
},
buildAnimeEmbed(anime) {
const genres = anime.genres?.map(g => g.name).join(', ') || 'N/A';
const studios = anime.studios?.map(s => s.name).join(', ') || 'N/A';
return createEmbed({
title: `🎌 ${anime.title}`,
url: anime.url,
description: truncate(anime.synopsis || 'No synopsis available.', 1000),
color: '#2E51A2',
thumbnail: anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url,
fields: [
{ name: '⭐ Score', value: `${anime.score || 'N/A'}/10`, inline: true },
{ name: '📊 Rank', value: `#${anime.rank || 'N/A'}`, inline: true },
{ name: '❤️ Popularity', value: `#${anime.popularity || 'N/A'}`, inline: true },
{ name: '📺 Episodes', value: `${anime.episodes || '?'}`, inline: true },
{ name: '📅 Status', value: anime.status || 'N/A', inline: true },
{ name: '📆 Aired', value: anime.aired?.string || 'N/A', inline: true },
{ name: '🎭 Genres', value: genres },
{ name: '🏢 Studios', value: studios }
],
footer: 'Source: MyAnimeList'
});
}
};
