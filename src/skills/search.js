// ==================== WEB SEARCH SKILL (CORRECTED) ====================
const axios = require('axios');
const { createEmbed, createErrorEmbed, truncate } = require('../utils/helpers');
const logger = require('../services/logger');
const settings = require('../config/settings');

class SearchService {
    async search(query, options = {}) {
        // Priority: Tavily > Serper > SerpAPI > Free
        if (process.env.TAVILY_API_KEY) {
            return this.tavilySearch(query, options);
        }
        if (process.env.SERPER_API_KEY) {
            return this.serperSearch(query, options);
        }
        if (process.env.SERPAPI_KEY) {
            return this.serpApiSearch(query, options);
        }
        return this.duckDuckGoSearch(query, options);
    }

    async tavilySearch(query, options = {}) {
        const { num = 5 } = options;
        try {
            const response = await axios.post('https://api.tavily.com/search', {
                api_key: process.env.TAVILY_API_KEY,
                query: query,
                max_results: num,
                search_depth: 'basic',
                include_answer: true,
                include_images: false
            }, { timeout: 10000 });

            const results = response.data.results || [];
            return results.map(r => ({
                title: r.title,
                url: r.url,
                snippet: r.content,
                source: 'Tavily'
            }));
        } catch (error) {
            logger.error(`Tavily search error: ${error.message}`);
            throw error;
        }
    }

    async serperSearch(query, options = {}) {
        const { num = 5 } = options;
        try {
            const response = await axios.post('https://google.serper.dev/search', {
                q: query,
                num: num,
                gl: 'id',
                hl: 'id'
            }, {
                headers: {
                    'X-API-KEY': process.env.SERPER_API_KEY,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });

            const results = response.data.organic || [];
            return results.slice(0, num).map(r => ({
                title: r.title,
                url: r.link,
                snippet: r.snippet,
                source: 'Serper'
            }));
        } catch (error) {
            logger.error(`Serper search error: ${error.message}`);
            throw error;
        }
    }

    async serpApiSearch(query, options = {}) {
        const { num = 5 } = options;
        try {
            const response = await axios.get('https://serpapi.com/search.json', {
                params: {
                    q: query,
                    api_key: process.env.SERPAPI_KEY,
                    engine: 'google',
                    num: num,
                    hl: 'id',
                    gl: 'id'
                },
                timeout: 10000
            });

            const results = response.data.organic_results || [];
            return results.slice(0, num).map(r => ({
                title: r.title,
                url: r.link,
                snippet: r.snippet,
                source: 'SerpAPI'
            }));
        } catch (error) {
            logger.error(`SerpAPI error: ${error.message}`);
            throw error;
        }
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
                results.push({
                    title: response.data.Heading || 'Summary',
                    url: response.data.AbstractURL || '',
                    snippet: response.data.AbstractText,
                    source: 'DuckDuckGo'
                });
            }

            if (response.data.RelatedTopics) {
                for (const topic of response.data.RelatedTopics.slice(0, num - results.length)) {
                    if (topic.Text && topic.FirstURL) {
                        results.push({
                            title: topic.Text.split(' - ')[0],
                            url: topic.FirstURL,
                            snippet: topic.Text,
                            source: 'DuckDuckGo'
                        });
                    }
                }
            }
            return results;
        } catch (error) {
            logger.warn(`DuckDuckGo failed: ${error.message}`);
            return [];
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
            return ctx.reply('Tulis query! Contoh: !search latest AI news');
        }

        await ctx.channel?.sendTyping();

        try {
            const results = await searchService.search(query, { num: 5 });

            if (!results || results.length === 0) {
                return ctx.reply('Tidak ada hasil ditemukan.');
            }

            let text = `🔍 **Hasil pencarian:** "${truncate(query, 50)}"\n\n`;
            
            results.forEach((r, i) => {
                text += `**${i + 1}. ${truncate(r.title, 80)}**\n`;
                text += `${truncate(r.snippet, 150)}\n`;
                text += `${r.url}\n\n`;
            });

            text += `📊 Source: ${results[0]?.source || 'Web'} | ${results.length} hasil`;

            // Split jika terlalu panjang
            if (text.length > 2000) {
                const chunks = this.splitText(text, 2000);
                for (const chunk of chunks) {
                    await ctx.reply(chunk);
                }
            } else {
                await ctx.reply(text);
            }

        } catch (error) {
            logger.error(`Search error: ${error.message}`);
            ctx.reply(`Error: ${error.message}`);
        }
    },
    splitText(text, maxLen = 2000) {
        if (text.length <= maxLen) return [text];
        const chunks = [];
        let current = '';
        const lines = text.split('\n');
        for (const line of lines) {
            if (current.length + line.length + 1 > maxLen) {
                if (current) chunks.push(current);
                current = line;
            } else {
                current += (current ? '\n' : '') + line;
            }
        }
        if (current) chunks.push(current);
        return chunks;
    }
};
