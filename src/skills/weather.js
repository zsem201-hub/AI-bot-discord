// ==================== WEATHER SKILL ====================
const axios = require('axios');
const { createEmbed, createErrorEmbed } = require('../utils/helpers');
const logger = require('../services/logger');
const settings = require('../config/settings');
const WEATHER_ICONS = {
'Clear': '☀️', 'Sunny': '☀️', 'Clouds': '☁️', 'Cloudy': '☁️',
'Partly cloudy': '⛅', 'Overcast': '🌥️',
'Rain': '🌧️', 'Drizzle': '🌦️', 'Showers': '🌧️',
'Thunderstorm': '⛈️', 'Storm': '⛈️',
'Snow': '🌨️', 'Sleet': '🌨️', 'Blizzard': '❄️',
'Mist': '🌫️', 'Fog': '🌫️', 'Haze': '🌫️',
'Wind': '💨', 'Tornado': '🌪️'
};
function getWeatherIcon(condition) {
for (const [key, icon] of Object.entries(WEATHER_ICONS)) {
if (condition.toLowerCase().includes(key.toLowerCase())) return icon;
}
return '🌡️';
}
class WeatherService {
async getWeather(location) {
if (process.env.OPENWEATHER_API_KEY) {
return this.openWeatherMap(location);
}
return this.wttrIn(location);
}
async openWeatherMap(location) {
const apiKey = process.env.OPENWEATHER_API_KEY;
const response = await axios.get('https://api.openweathermap.org/data/2.5/weather', {
params: { q: location, appid: apiKey, units: 'metric' },
timeout: 10000
});
const data = response.data;
return {
location: `${data.name}, ${data.sys.country}`,
condition: data.weather[0].main,
description: data.weather[0].description,
temperature: Math.round(data.main.temp),
feelsLike: Math.round(data.main.feels_like),
humidity: data.main.humidity,
wind: Math.round(data.wind.speed * 3.6),
pressure: data.main.pressure,
visibility: data.visibility ? Math.round(data.visibility / 1000) : null,
sunrise: new Date(data.sys.sunrise * 1000).toLocaleTimeString(),
sunset: new Date(data.sys.sunset * 1000).toLocaleTimeString(),
icon: getWeatherIcon(data.weather[0].main)
};
}
async wttrIn(location) {
const response = await axios.get(`https://wttr.in/${encodeURIComponent(location)}?format=j1`, { timeout: 10000 });
const data = response.data;
const current = data.current_condition[0];
const area = data.nearest_area[0];
return {
location: `${area.areaName[0].value}, ${area.country[0].value}`,
condition: current.weatherDesc[0].value,
description: current.weatherDesc[0].value,
temperature: parseInt(current.temp_C),
feelsLike: parseInt(current.FeelsLikeC),
humidity: parseInt(current.humidity),
wind: parseInt(current.windspeedKmph),
pressure: parseInt(current.pressure),
visibility: parseInt(current.visibility),
uvIndex: parseInt(current.uvIndex),
icon: getWeatherIcon(current.weatherDesc[0].value)
};
}
}
const weatherService = new WeatherService();
module.exports = {
name: 'weather',
description: 'Get weather information',
usage: '!weather <location>',
cooldown: 5,
async execute(ctx, args) {
const location = ctx.options?.getString('location') || args.join(' ');
if (!location) {
await ctx.reply({ embeds: [createErrorEmbed('Please provide a location!\nUsage: `!weather <city>`\n\nExamples:\n• `!weather Jakarta`\n• `!weather New York`\n• `!weather Tokyo, Japan`')] });
return;
}
await ctx.deferReply?.() || ctx.channel?.sendTyping();
try {
const weather = await weatherService.getWeather(location);
const embed = createEmbed({
title: `${weather.icon} Weather in ${weather.location}`,
color: settings.colors.primary,
fields: [
{ name: '🌡️ Temperature', value: `**${weather.temperature}°C**\nFeels like: ${weather.feelsLike}°C`, inline: true },
{ name: '☁️ Condition', value: weather.description.charAt(0).toUpperCase() + weather.description.slice(1), inline: true },
{ name: '💧 Humidity', value: `${weather.humidity}%`, inline: true },
{ name: '💨 Wind', value: `${weather.wind} km/h`, inline: true },
{ name: '📊 Pressure', value: `${weather.pressure} hPa`, inline: true },
{ name: '👁️ Visibility', value: weather.visibility ? `${weather.visibility} km` : 'N/A', inline: true }
],
footer: `Updated just now`
});
if (weather.sunrise && weather.sunset) {
embed.addFields({ name: '🌅 Sun', value: `Rise: ${weather.sunrise}\nSet: ${weather.sunset}`, inline: true });
}
if (weather.uvIndex !== undefined) {
embed.addFields({ name: '☀️ UV Index', value: weather.uvIndex.toString(), inline: true });
}
await (ctx.editReply ? ctx.editReply({ embeds: [embed] }) : ctx.reply({ embeds: [embed] }));
} catch (error) {
logger.error(`Weather error: ${error.message}`);
const errorMsg = error.response?.status === 404 ? 'Location not found. Please check the city name.' : `Failed to get weather: ${error.message}`;
await (ctx.editReply ? ctx.editReply({ embeds: [createErrorEmbed(errorMsg)] }) : ctx.reply({ embeds: [createErrorEmbed(errorMsg)] }));
}
}
};
