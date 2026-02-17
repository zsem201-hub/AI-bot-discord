// ==================== WIKIPEDIA SKILL ====================
const axios = require('axios');
const { createEmbed, createErrorEmbed, truncate } = require('../utils/helpers');
const logger = require('../services/logger');
const settings = require('../config/settings');
module.exports = {
name: 'wiki',
description: 'Search Wikipedia',
usage: '!wiki <query>',
cooldown: 3,
async execute(ctx, args) {
const query = ctx.options?.getString('query') || args.join(' ');
if (!query) {
await ctx.reply({ embeds: [createErrorEmbed('Please provide a search query!\nUsage: `!wiki <topic>`')] });
return;
}
await ctx.deferReply?.() || ctx.channel?.sendTyping();
try {
const searchResponse = await axios.get('https://en.wikipedia.org/w/api.php', {
params: { action: 'query', list: 'search', srsearch: query, format: 'json', srlimit: 1 },
timeout: 10000
});
const searchResults = searchResponse.data.query.search;
if (!searchResults || searchResults.length === 0) {
await (ctx.editReply ? ctx.editReply({ embeds: [createErrorEmbed(`No Wikipedia article found for "${query}"`)] }) : ctx.reply({ embeds: [createErrorEmbed(`No Wikipedia article found for "${query}"`)] }));
return;
}
const pageTitle = searchResults[0].title;
const contentResponse = await axios.get('https://en.wikipedia.org/w/api.php', {
params: { action: 'query', titles: pageTitle, prop: 'extracts|pageimages|info', exintro: true, explaintext: true, piprop: 'original', inprop: 'url', format: 'json' },
timeout: 10000
});
const pages = contentResponse.data.query.pages;
const page = Object.values(pages)[0];
if (!page || page.missing) {
await (ctx.editReply ? ctx.editReply({ embeds: [createErrorEmbed(`Article not found.`)] }) : ctx.reply({ embeds: [createErrorEmbed(`Article not found.`)] }));
return;
}
const embed = createEmbed({
title: `📖 ${page.title}`,
url: page.fullurl,
description: truncate(page.extract || 'No description available.', 2000),
color: settings.colors.primary,
footer: 'Source: Wikipedia'
});
if (page.original?.source) {
embed.setThumbnail(page.original.source);
}
await (ctx.editReply ? ctx.editReply({ embeds: [embed] }) : ctx.reply({ embeds: [embed] }));
} catch (error) {
logger.error(`Wiki error: ${error.message}`);
await (ctx.editReply ? ctx.editReply({ embeds: [createErrorEmbed(`Failed to search Wikipedia: ${error.message}`)] }) : ctx.reply({ embeds: [createErrorEmbed(`Failed to search Wikipedia: ${error.message}`)] }));
}
}
};
