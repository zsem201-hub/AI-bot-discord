// ==================== GIVEAWAY SKILL ====================
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createEmbed, createErrorEmbed, parseTime, formatDuration } = require('../utils/helpers');
const { isOwner } = require('../utils/permissions');
const logger = require('../services/logger');
const settings = require('../config/settings');
const activeGiveaways = new Map();
module.exports = {
name: 'giveaway',
description: 'Create and manage giveaways',
usage: '!giveaway <duration> <winners> <prize>',
cooldown: 10,
async execute(ctx, args) {
const userId = ctx.author?.id || ctx.user?.id;
const subcommand = ctx.options?.getSubcommand?.() || args[0]?.toLowerCase();
if (subcommand === 'list') {
const giveaways = Array.from(activeGiveaways.values()).filter(g => g.channelId === ctx.channel.id);
if (giveaways.length === 0) {
await ctx.reply({ embeds: [createEmbed({ title: '🎉 Active Giveaways', description: 'No active giveaways in this channel.', color: settings.colors.info })] });
return;
}
let description = '';
for (const g of giveaways) {
const timeLeft = g.endTime - Date.now();
description += `**${g.prize}**\n`;
description += `Winners: ${g.winnerCount} | Ends: <t:${Math.floor(g.endTime / 1000)}:R>\n`;
description += `Entries: ${g.participants.size}\n\n`;
}
await ctx.reply({ embeds: [createEmbed({ title: '🎉 Active Giveaways', description, color: settings.colors.primary })] });
return;
}
if (subcommand === 'end') {
const messageId = args[1];
if (!messageId) {
await ctx.reply({ embeds: [createErrorEmbed('Please provide giveaway message ID!')] });
return;
}
const giveaway = Array.from(activeGiveaways.values()).find(g => g.messageId === messageId);
if (!giveaway) {
await ctx.reply({ embeds: [createErrorEmbed('Giveaway not found!')] });
return;
}
if (giveaway.hostId !== userId && !isOwner(userId)) {
await ctx.reply({ embeds: [createErrorEmbed('You can only end your own giveaways!')] });
return;
}
await this.endGiveaway(giveaway.id, ctx.client);
await ctx.reply({ embeds: [createEmbed({ title: '✅ Giveaway Ended', description: 'The giveaway has been ended.', color: settings.colors.success })] });
return;
}
if (subcommand === 'reroll') {
const messageId = args[1];
if (!messageId) {
await ctx.reply({ embeds: [createErrorEmbed('Please provide giveaway message ID!')] });
return;
}
await ctx.reply({ embeds: [createEmbed({ title: '🔄 Reroll', description: 'Reroll feature - pick new winner from ended giveaway', color: settings.colors.info })] });
return;
}
const durationStr = ctx.options?.getString('duration') || args[0];
const winnerCount = ctx.options?.getInteger('winners') || parseInt(args[1]) || 1;
const prize = ctx.options?.getString('prize') || args.slice(2).join(' ');
if (!durationStr || !prize) {
const embed = createEmbed({
title: '🎉 Giveaway Help',
color: settings.colors.info,
fields: [
{ name: 'Create Giveaway', value: '`!giveaway <duration> <winners> <prize>`' },
{ name: 'List Active', value: '`!giveaway list`' },
{ name: 'End Early', value: '`!giveaway end <messageId>`' },
{ name: 'Duration Format', value: '`30m` - 30 minutes\n`2h` - 2 hours\n`1d` - 1 day' },
{ name: 'Examples', value: '`!giveaway 1h 1 Discord Nitro`\n`!giveaway 1d 3 Steam Gift Card $10`\n`!giveaway 30m 1 Special Role`' }
]
});
await ctx.reply({ embeds: [embed] });
return;
}
const duration = parseTime(durationStr);
if (!duration || duration < 60000 || duration > 30 * 24 * 60 * 60 * 1000) {
await ctx.reply({ embeds: [createErrorEmbed('Invalid duration! Min: 1 minute, Max: 30 days')] });
return;
}
if (winnerCount < 1 || winnerCount > 20) {
await ctx.reply({ embeds: [createErrorEmbed('Winner count must be between 1 and 20!')] });
return;
}
const giveawayId = Date.now().toString(36);
const endTime = Date.now() + duration;
const embed = new EmbedBuilder()
.setTitle('🎉 GIVEAWAY 🎉')
.setDescription(`**${prize}**\n\nReact with 🎉 to enter!\n\n⏰ Ends: <t:${Math.floor(endTime / 1000)}:R>\n🏆 Winners: ${winnerCount}\n👤 Hosted by: <@${userId}>`)
.setColor('#FF69B4')
.setFooter({ text: `Giveaway ID: ${giveawayId} | Ends at` })
.setTimestamp(new Date(endTime));
try {
const message = await ctx.channel.send({ embeds: [embed] });
await message.react('🎉');
const giveawayData = {
id: giveawayId,
messageId: message.id,
channelId: ctx.channel.id,
guildId: ctx.guild?.id,
hostId: userId,
prize,
winnerCount,
endTime,
participants: new Set(),
ended: false
};
activeGiveaways.set(giveawayId, giveawayData);
setTimeout(async () => {
await this.endGiveaway(giveawayId, ctx.client);
}, duration);
const collector = message.createReactionCollector({
filter: (reaction, user) => reaction.emoji.name === '🎉' && !user.bot,
time: duration
});
collector.on('collect', (reaction, user) => {
const giveaway = activeGiveaways.get(giveawayId);
if (giveaway) {
giveaway.participants.add(user.id);
}
});
await ctx.reply({ embeds: [createEmbed({ title: '✅ Giveaway Created!', description: `Prize: **${prize}**\nDuration: ${formatDuration(duration)}\nWinners: ${winnerCount}`, color: settings.colors.success })], ephemeral: true });
} catch (error) {
logger.error(`Giveaway error: ${error.message}`);
await ctx.reply({ embeds: [createErrorEmbed(`Failed to create giveaway: ${error.message}`)] });
}
},
async endGiveaway(giveawayId, client) {
const giveaway = activeGiveaways.get(giveawayId);
if (!giveaway || giveaway.ended) return;
giveaway.ended = true;
try {
const channel = await client.channels.fetch(giveaway.channelId);
const message = await channel.messages.fetch(giveaway.messageId);
const reaction = message.reactions.cache.get('🎉');
let users = [];
if (reaction) {
const fetched = await reaction.users.fetch();
users = fetched.filter(u => !u.bot && u.id !== giveaway.hostId).map(u => u.id);
}
let winners = [];
if (users.length > 0) {
const shuffled = users.sort(() => Math.random() - 0.5);
winners = shuffled.slice(0, Math.min(giveaway.winnerCount, shuffled.length));
}
let description;
if (winners.length === 0) {
description = `**${giveaway.prize}**\n\n😢 No valid entries, no winner could be determined.`;
} else {
const winnerMentions = winners.map(id => `<@${id}>`).join(', ');
description = `**${giveaway.prize}**\n\n🏆 **Winner(s):** ${winnerMentions}\n\nCongratulations! 🎊`;
}
const embed = new EmbedBuilder()
.setTitle('🎉 GIVEAWAY ENDED 🎉')
.setDescription(description)
.setColor(winners.length > 0 ? '#00FF00' : '#FF0000')
.addFields({ name: '📊 Total Entries', value: users.length.toString(), inline: true }, { name: '👤 Hosted by', value: `<@${giveaway.hostId}>`, inline: true })
.setFooter({ text: 'Giveaway ended' })
.setTimestamp();
await message.edit({ embeds: [embed] });
if (winners.length > 0) {
const winnerMentions = winners.map(id => `<@${id}>`).join(', ');
await channel.send(`🎉 Congratulations ${winnerMentions}! You won **${giveaway.prize}**!`);
}
activeGiveaways.delete(giveawayId);
} catch (error) {
logger.error(`End giveaway error: ${error.message}`);
activeGiveaways.delete(giveawayId);
}
}
};
