// ==================== CRYPTO SKILL ====================
const axios = require('axios');
const { createEmbed, createErrorEmbed, formatNumber } = require('../utils/helpers');
const logger = require('../services/logger');
const settings = require('../config/settings');
const CRYPTO_ALIASES = {
'btc': 'bitcoin', 'eth': 'ethereum', 'bnb': 'binancecoin', 'xrp': 'ripple',
'ada': 'cardano', 'doge': 'dogecoin', 'sol': 'solana', 'dot': 'polkadot',
'matic': 'matic-network', 'shib': 'shiba-inu', 'ltc': 'litecoin', 'avax': 'avalanche-2',
'link': 'chainlink', 'atom': 'cosmos', 'uni': 'uniswap', 'etc': 'ethereum-classic',
'xlm': 'stellar', 'algo': 'algorand', 'near': 'near', 'ftm': 'fantom',
'usdt': 'tether', 'usdc': 'usd-coin', 'busd': 'binance-usd', 'dai': 'dai'
};
class CryptoService {
constructor() {
this.baseUrl = 'https://api.coingecko.com/api/v3';
}
async getPrice(coinId) {
const id = CRYPTO_ALIASES[coinId.toLowerCase()] || coinId.toLowerCase();
const response = await axios.get(`${this.baseUrl}/coins/${id}`, {
params: { localization: false, tickers: false, community_data: false, developer_data: false, sparkline: false },
timeout: 10000
});
const data = response.data;
const market = data.market_data;
return {
name: data.name,
symbol: data.symbol.toUpperCase(),
image: data.image?.small,
price: market.current_price.usd,
priceIDR: market.current_price.idr,
change24h: market.price_change_percentage_24h,
change7d: market.price_change_percentage_7d,
change30d: market.price_change_percentage_30d,
high24h: market.high_24h.usd,
low24h: market.low_24h.usd,
marketCap: market.market_cap.usd,
marketCapRank: data.market_cap_rank,
volume24h: market.total_volume.usd,
circulatingSupply: market.circulating_supply,
totalSupply: market.total_supply,
ath: market.ath.usd,
athDate: market.ath_date.usd,
athChange: market.ath_change_percentage.usd
};
}
async getTopCoins(limit = 10) {
const response = await axios.get(`${this.baseUrl}/coins/markets`, {
params: { vs_currency: 'usd', order: 'market_cap_desc', per_page: limit, page: 1, sparkline: false },
timeout: 10000
});
return response.data.map(coin => ({
rank: coin.market_cap_rank,
name: coin.name,
symbol: coin.symbol.toUpperCase(),
price: coin.current_price,
change24h: coin.price_change_percentage_24h,
marketCap: coin.market_cap
}));
}
}
const cryptoService = new CryptoService();
function formatChange(change) {
if (change === null || change === undefined) return 'N/A';
const emoji = change >= 0 ? '📈' : '📉';
const sign = change >= 0 ? '+' : '';
return `${emoji} ${sign}${change.toFixed(2)}%`;
}
function formatPrice(price) {
if (price >= 1) return `$${formatNumber(price.toFixed(2))}`;
if (price >= 0.01) return `$${price.toFixed(4)}`;
return `$${price.toFixed(8)}`;
}
module.exports = {
name: 'crypto',
description: 'Get cryptocurrency prices',
usage: '!crypto <symbol>',
cooldown: 5,
async execute(ctx, args) {
const symbol = ctx.options?.getString('symbol') || args[0];
if (!symbol) {
try {
await ctx.deferReply?.() || ctx.channel?.sendTyping();
const topCoins = await cryptoService.getTopCoins(10);
let description = '';
for (const coin of topCoins) {
description += `**${coin.rank}. ${coin.name}** (${coin.symbol})\n`;
description += `${formatPrice(coin.price)} ${formatChange(coin.change24h)}\n\n`;
}
const embed = createEmbed({
title: '💰 Top 10 Cryptocurrencies',
description,
color: settings.colors.primary,
footer: 'Data from CoinGecko | Use !crypto <symbol> for details'
});
await (ctx.editReply ? ctx.editReply({ embeds: [embed] }) : ctx.reply({ embeds: [embed] }));
} catch (error) {
logger.error(`Crypto top error: ${error.message}`);
await (ctx.editReply ? ctx.editReply({ embeds: [createErrorEmbed(`Failed to get data: ${error.message}`)] }) : ctx.reply({ embeds: [createErrorEmbed(`Failed to get data: ${error.message}`)] }));
}
return;
}
await ctx.deferReply?.() || ctx.channel?.sendTyping();
try {
const crypto = await cryptoService.getPrice(symbol);
const embed = createEmbed({
title: `${crypto.name} (${crypto.symbol})`,
color: crypto.change24h >= 0 ? '#00FF00' : '#FF0000',
thumbnail: crypto.image,
fields: [
{ name: '💵 Price USD', value: formatPrice(crypto.price), inline: true },
{ name: '💵 Price IDR', value: `Rp ${formatNumber(Math.round(crypto.priceIDR))}`, inline: true },
{ name: '📊 Rank', value: `#${crypto.marketCapRank || 'N/A'}`, inline: true },
{ name: '24h Change', value: formatChange(crypto.change24h), inline: true },
{ name: '7d Change', value: formatChange(crypto.change7d), inline: true },
{ name: '30d Change', value: formatChange(crypto.change30d), inline: true },
{ name: '24h High', value: formatPrice(crypto.high24h), inline: true },
{ name: '24h Low', value: formatPrice(crypto.low24h), inline: true },
{ name: '24h Volume', value: `$${formatNumber(Math.round(crypto.volume24h))}`, inline: true },
{ name: '💎 Market Cap', value: `$${formatNumber(Math.round(crypto.marketCap))}`, inline: false },
{ name: '🏆 ATH', value: `${formatPrice(crypto.ath)} (${crypto.athChange.toFixed(1)}% from ATH)`, inline: false }
],
footer: 'Data from CoinGecko'
});
await (ctx.editReply ? ctx.editReply({ embeds: [embed] }) : ctx.reply({ embeds: [embed] }));
} catch (error) {
logger.error(`Crypto error: ${error.message}`);
const errorMsg = error.response?.status === 404 ? `Coin "${symbol}" not found. Try using full name or check symbol.` : `Failed to get crypto data: ${error.message}`;
await (ctx.editReply ? ctx.editReply({ embeds: [createErrorEmbed(errorMsg)] }) : ctx.reply({ embeds: [createErrorEmbed(errorMsg)] }));
}
}
};
