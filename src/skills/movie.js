// ==================== MOVIE SKILL ====================
const axios = require('axios');
const { createEmbed, createErrorEmbed, truncate } = require('../utils/helpers');
const logger = require('../services/logger');
const settings = require('../config/settings');
class TMDBService {
constructor() {
this.baseUrl = 'https://api.themoviedb.org/3';
this.apiKey = process.env.TMDB_API_KEY;
this.imageBase = 'https://image.tmdb.org/t/p/w500';
}
async searchMovie(query) {
const response = await axios.get(`${this.baseUrl}/search/movie`, {
params: { api_key: this.apiKey, query, include_adult: false },
timeout: 10000
});
return response.data.results[0];
}
async getMovieDetails(id) {
const response = await axios.get(`${this.baseUrl}/movie/${id}`, {
params: { api_key: this.apiKey, append_to_response: 'credits,videos,release_dates' },
timeout: 10000
});
return response.data;
}
async searchTV(query) {
const response = await axios.get(`${this.baseUrl}/search/tv`, {
params: { api_key: this.apiKey, query },
timeout: 10000
});
return response.data.results[0];
}
async getTrending(type = 'movie') {
const response = await axios.get(`${this.baseUrl}/trending/${type}/week`, {
params: { api_key: this.apiKey },
timeout: 10000
});
return response.data.results.slice(0, 10);
}
async getPopular(type = 'movie') {
const response = await axios.get(`${this.baseUrl}/${type}/popular`, {
params: { api_key: this.apiKey },
timeout: 10000
});
return response.data.results.slice(0, 10);
}
}
class OMDBService {
constructor() {
this.baseUrl = 'http://www.omdbapi.com';
this.apiKey = process.env.OMDB_API_KEY || 'trilogy';
}
async search(query, type = 'movie') {
const response = await axios.get(this.baseUrl, {
params: { apikey: this.apiKey, t: query, type, plot: 'full' },
timeout: 10000
});
if (response.data.Response === 'False') return null;
return response.data;
}
}
const tmdb = new TMDBService();
const omdb = new OMDBService();
module.exports = {
name: 'movie',
description: 'Search movie and TV show information',
usage: '!movie <title>',
cooldown: 5,
async execute(ctx, args) {
const subcommand = ctx.options?.getSubcommand?.() || args[0]?.toLowerCase();
const query = ctx.options?.getString('query') || args.slice(['trending', 'popular', 'tv'].includes(subcommand) ? 1 : 0).join(' ');
if (subcommand === 'trending') {
await ctx.deferReply?.() || ctx.channel?.sendTyping();
try {
const trending = process.env.TMDB_API_KEY ? await tmdb.getTrending('movie') : null;
if (!trending) {
await (ctx.editReply ? ctx.editReply({ embeds: [createErrorEmbed('TMDB API key required for trending.')] }) : ctx.reply({ embeds: [createErrorEmbed('TMDB API key required.')] }));
return;
}
let description = '';
for (let i = 0; i < trending.length; i++) {
const m = trending[i];
description += `**${i + 1}. ${m.title || m.name}** (${(m.release_date || m.first_air_date || '').substring(0, 4)})\n`;
description += `⭐ ${m.vote_average?.toFixed(1) || 'N/A'}\n\n`;
}
const embed = createEmbed({ title: '🔥 Trending Movies This Week', description, color: '#E50914', thumbnail: trending[0]?.poster_path ? `https://image.tmdb.org/t/p/w200${trending[0].poster_path}` : null, footer: 'Source: TMDB' });
await (ctx.editReply ? ctx.editReply({ embeds: [embed] }) : ctx.reply({ embeds: [embed] }));
return;
} catch (error) {
await (ctx.editReply ? ctx.editReply({ embeds: [createErrorEmbed(`Failed: ${error.message}`)] }) : ctx.reply({ embeds: [createErrorEmbed(`Failed: ${error.message}`)] }));
return;
}
}
if (!query) {
const embed = createEmbed({
title: '🎬 Movie Search Help',
color: '#E50914',
fields: [
{ name: 'Search Movie', value: '`!movie <title>`' },
{ name: 'Search TV Show', value: '`!movie tv <title>`' },
{ name: 'Trending', value: '`!movie trending`' },
{ name: 'Examples', value: '`!movie Inception`\n`!movie Avengers Endgame`\n`!movie tv Breaking Bad`' }
]
});
await ctx.reply({ embeds: [embed] });
return;
}
await ctx.deferReply?.() || ctx.channel?.sendTyping();
try {
let movie;
if (subcommand === 'tv') {
movie = await omdb.search(query, 'series');
} else {
movie = await omdb.search(query, 'movie');
}
if (!movie) {
await (ctx.editReply ? ctx.editReply({ embeds: [createErrorEmbed(`No results found for "${query}"`)] }) : ctx.reply({ embeds: [createErrorEmbed(`No results found for "${query}"`)] }));
return;
}
const embed = createEmbed({
title: `🎬 ${movie.Title} (${movie.Year})`,
description: truncate(movie.Plot || 'No plot available.', 1000),
color: '#E50914',
thumbnail: movie.Poster !== 'N/A' ? movie.Poster : null,
fields: [
{ name: '⭐ Rating', value: `IMDb: ${movie.imdbRating || 'N/A'}/10\nMetascore: ${movie.Metascore || 'N/A'}`, inline: true },
{ name: '📅 Released', value: movie.Released || 'N/A', inline: true },
{ name: '⏱️ Runtime', value: movie.Runtime || 'N/A', inline: true },
{ name: '🎭 Genre', value: movie.Genre || 'N/A', inline: true },
{ name: '🌍 Country', value: movie.Country || 'N/A', inline: true },
{ name: '🗣️ Language', value: movie.Language || 'N/A', inline: true },
{ name: '🎬 Director', value: movie.Director || 'N/A' },
{ name: '⭐ Cast', value: truncate(movie.Actors || 'N/A', 200) },
{ name: '🏆 Awards', value: truncate(movie.Awards || 'N/A', 200) }
],
footer: `Source: OMDB | Type: ${movie.Type}`
});
if (movie.imdbID) {
embed.setURL(`https://www.imdb.com/title/${movie.imdbID}`);
}
await (ctx.editReply ? ctx.editReply({ embeds: [embed] }) : ctx.reply({ embeds: [embed] }));
} catch (error) {
logger.error(`Movie error: ${error.message}`);
await (ctx.editReply ? ctx.editReply({ embeds: [createErrorEmbed(`Failed: ${error.message}`)] }) : ctx.reply({ embeds: [createErrorEmbed(`Failed: ${error.message}`)] }));
}
}
};
