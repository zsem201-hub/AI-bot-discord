// ==================== WEB SEARCH SKILL ====================
const axios = require('axios');
const { createEmbed, createErrorEmbed, truncate } = require('../utils/helpers');
const logger = require('../services/logger');
const settings = require('../config/settings');
class SearchService {
async search(query, options = {}) {
if (process.env.SERPAPI_KEY) {
return this.serpApiSearch(query, options);
}
if (process.env.BRAVE_API_KEY) {
return this.braveSearch(query, options);
}
return this.duckDuckGoSearch(query, options);
}
async serpApiSearch(query, options = {}) {
const { num = 5 } = options;
const response = await axios.get('https://serpapi.com/search', {
params: { q: query, api_key: process.env.SERPAPI_KEY, num, engine: 'google' },
timeout: 10000
});
const results = response.data.organic_results || [];
return results.slice(0, num).map(r => ({
title: r.title,
url: r.link,
snippet: r.snippet,
source: 'Google'
}));
}
async braveSearch(query, options = {}) {
const { num = 5 } = options;
const response = await axios.get('https://api.search.brave.com/res/v1/web/search', {
params: { q: query, count: num },
headers: { 'X-Subscription-Token': process.env.BRAVE_API_KEY },
timeout: 10000
});
const results = response.data.web?.results || [];
return results.slice(0, num).map(r => ({
title: r.title,
url: r.url,
snippet: r.description,
source: 'Brave'
}));
}
async duckDuckGoSearch(query, options = {}) {
const { num = 5 } = options;
try {
const response = await axios.get('https://api.duckduckgo.com/', {
params: { q: query, format: 'json', no_html: 1, skip_disambig: 1 },
timeout: 10000
});
const results = [];
if (response.data.AbstractText) {
results.push({ title: response.data.Heading || 'Summary', url: response.data.AbstractURL || '', snippet: response.data.AbstractText, source: 'DuckDuckGo' });
}
if (response.data.RelatedTopics) {
for (const topic of response.data.RelatedTopics.slice(0, num - results.length)) {
if (topic.Text && topic.FirstURL) {
results.push({ title: topic.Text.split(' - ')[0], url: topic.FirstURL, snippet: topic.Text, source: 'DuckDuckGo' });
}
}
}
return results;
} catch (error) {
logger.warn(`DuckDuckGo search failed: ${error.message}`);
return [{ title: 'Search Error', url: '', snippet: 'Free search temporarily unavailable. Configure SERPAPI_KEY or BRAVE_API_KEY for better results.', source: 'Error' }];
}
}
}
const searchService = new SearchService();
module.exports = {
name: 'search',
description: 'Search the web',
usage: '!search <query>',
cooldown: 5,
async execute(ctx, args) {
const query = ctx.options?.getString('query') || args.join(' ');
if (!query) {
await ctx.reply({ embeds: [createErrorEmbed('Please provide a search query!\nUsage: `!search <query>`')] });
return;
}
await ctx.deferReply?.() || ctx.channel?.sendTyping();
try {
const results = await searchService.search(query, { num: 5 });
if (!results || results.length === 0) {
await (ctx.editReply ? ctx.editReply({ embeds: [createErrorEmbed('No results found.')] }) : ctx.reply({ embeds: [createErrorEmbed('No results found.')] }));
return;
}
const embed = createEmbed({
title: `🔍 Search: "${truncate(query, 50)}"`,
color: settings.colors.primary,
footer: `Source: ${results[0]?.source || 'Web'} | ${results.length} results`
});
for (let i = 0; i < results.length && i < 5; i++) {
const r = results[i];
const title = truncate(r.title, 100);
const snippet = truncate(r.snippet, 200);
const value = r.url ? `${snippet}\n[Link](${r.url})` : snippet;
embed.addFields({ name: `${i + 1}. ${title}`, value });
}
await (ctx.editReply ? ctx.editReply({ embeds: [embed] }) : ctx.reply({ embeds: [embed] }));
} catch (error) {
logger.error(`Search error: ${error.message}`);
await (ctx.editReply ? ctx.editReply({ embeds: [createErrorEmbed(`Search failed: ${error.message}`)] }) : ctx.reply({ embeds: [createErrorEmbed(`Search failed: ${error.message}`)] }));
}
}
};
