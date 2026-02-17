// ==================== NEWS SKILL ====================
const axios = require('axios');
const { createEmbed, createErrorEmbed, truncate } = require('../utils/helpers');
const logger = require('../services/logger');
const settings = require('../config/settings');
class NewsService {
async getNews(query = null, category = 'general', limit = 5) {
if (process.env.NEWS_API_KEY) {
return this.newsApi(query, category, limit);
}
return this.gnewsApi(query, limit);
}
async newsApi(query, category, limit) {
const params = { apiKey: process.env.NEWS_API_KEY, pageSize: limit, language: 'en' };
let url = 'https://newsapi.org/v2/top-headlines';
if (query) {
url = 'https://newsapi.org/v2/everything';
params.q = query;
params.sortBy = 'publishedAt';
} else {
params.category = category;
params.country = 'us';
}
const response = await axios.get(url, { params, timeout: 10000 });
return response.data.articles.map(a => ({
title: a.title,
description: a.description,
url: a.url,
source: a.source?.name,
publishedAt: a.publishedAt,
image: a.urlToImage
}));
}
async gnewsApi(query, limit) {
const apiKey = process.env.GNEWS_API_KEY || 'demo';
const params = { token: apiKey, max: limit, lang: 'en' };
let url = 'https://gnews.io/api/v4/top-headlines';
if (query) {
url = 'https://gnews.io/api/v4/search';
params.q = query;
}
const response = await axios.get(url, { params, timeout: 10000 });
return response.data.articles.map(a => ({
title: a.title,
description: a.description,
url: a.url,
source: a.source?.name,
publishedAt: a.publishedAt,
image: a.image
}));
}
}
const newsService = new NewsService();
module.exports = {
name: 'news',
description: 'Get latest news',
usage: '!news [topic]',
cooldown: 5,
async execute(ctx, args) {
const topic = ctx.options?.getString('topic') || args.join(' ') || null;
await ctx.deferReply?.() || ctx.channel?.sendTyping();
try {
const articles = await newsService.getNews(topic, 'general', 5);
if (!articles || articles.length === 0) {
await (ctx.editReply ? ctx.editReply({ embeds: [createErrorEmbed('No news found.')] }) : ctx.reply({ embeds: [createErrorEmbed('No news found.')] }));
return;
}
const embed = createEmbed({
title: topic ? `📰 News: "${truncate(topic, 30)}"` : '📰 Latest News',
color: settings.colors.primary,
footer: `Showing ${articles.length} articles`
});
for (let i = 0; i < articles.length && i < 5; i++) {
const article = articles[i];
const title = truncate(article.title, 100);
const desc = truncate(article.description || 'No description', 150);
const date = article.publishedAt ? new Date(article.publishedAt).toLocaleDateString() : '';
embed.addFields({
name: `${i + 1}. ${title}`,
value: `${desc}\n[Read more](${article.url}) | ${article.source || 'Unknown'} ${date ? `| ${date}` : ''}`
});
}
if (articles[0]?.image) {
embed.setThumbnail(articles[0].image);
}
await (ctx.editReply ? ctx.editReply({ embeds: [embed] }) : ctx.reply({ embeds: [embed] }));
} catch (error) {
logger.error(`News error: ${error.message}`);
await (ctx.editReply ? ctx.editReply({ embeds: [createErrorEmbed(`Failed to get news: ${error.message}`)] }) : ctx.reply({ embeds: [createErrorEmbed(`Failed to get news: ${error.message}`)] }));
}
}
};
