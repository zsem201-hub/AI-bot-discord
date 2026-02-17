// ==================== POLL SKILL ====================
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createEmbed, createErrorEmbed, parseTime } = require('../utils/helpers');
const db = require('../services/database');
const logger = require('../services/logger');
const settings = require('../config/settings');
const activePolls = new Map();
module.exports = {
name: 'poll',
description: 'Create polls and voting',
usage: '!poll "question" "option1" "option2" ...',
cooldown: 10,
async execute(ctx, args) {
const userId = ctx.author?.id || ctx.user?.id;
const input = ctx.options?.getString('question') || args.join(' ');
if (!input) {
const embed = createEmbed({
title: '📊 Poll Help',
description: 'Create interactive polls',
color: settings.colors.info,
fields: [
{ name: 'Usage', value: '`!poll "Question" "Option 1" "Option 2" ...`' },
{ name: 'Quick Poll', value: '`!poll Question here?`\n(Creates Yes/No poll)' },
{ name: 'Timed Poll', value: '`!poll 1h "Question" "Op1" "Op2"`\n(Ends after 1 hour)' },
{ name: 'Examples', value: '`!poll "Best game?" "Valorant" "CS2" "Apex"`\n`!poll Should we do movie night?`\n`!poll 30m "Lunch where?" "KFC" "McD" "Pizza"`' }
]
});
await ctx.reply({ embeds: [embed] });
return;
}
let duration = null;
let processedInput = input;
const timeMatch = input.match(/^(\d+[smhdw])\s+/);
if (timeMatch) {
duration = parseTime(timeMatch[1]);
processedInput = input.slice(timeMatch[0].length);
}
const matches = processedInput.match(/"([^"]+)"/g);
let question, options;
if (matches && matches.length >= 2) {
question = matches[0].replace(/"/g, '');
options = matches.slice(1).map(m => m.replace(/"/g, ''));
} else {
question = processedInput.replace(/"/g, '');
options = ['Yes ✅', 'No ❌'];
}
if (options.length < 2) {
await ctx.reply({ embeds: [createErrorEmbed('Poll needs at least 2 options!')] });
return;
}
if (options.length > 10) {
await ctx.reply({ embeds: [createErrorEmbed('Maximum 10 options allowed!')] });
return;
}
const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
const pollId = Date.now().toString(36);
let optionsText = '';
for (let i = 0; i < options.length; i++) {
optionsText += `${emojis[i]} ${options[i]}\n`;
}
const embed = new EmbedBuilder()
.setTitle('📊 ' + question)
.setDescription(optionsText)
.setColor(settings.colors.primary)
.setFooter({ text: `Poll by ${ctx.author?.username || ctx.user?.username}${duration ? ` | Ends in ${timeMatch[1]}` : ''} | ID: ${pollId}` })
.setTimestamp();
const pollData = {
id visitan: pollId,
question,
options,
votes: {},
voters: new Set(),
creatorId: userId,
channelId: ctx.channel.id,
endTime: duration ? Date.now() + duration : null
};
try {
const message = await (ctx.reply ? ctx.reply({ embeds: [embed], fetchReply: true }) : ctx.channel.send({ embeds: [embed] }));
pollData.messageId = message.id;
for (let i = 0; i < options.length; i++) {
await message.react(emojis[i]);
pollData.votes[emojis[i]] = 0;
}
activePolls.set(pollId, pollData);
if (duration) {
setTimeout(async () => {
await this.endPoll(pollId, ctx.client);
}, duration);
}
const collector = message.createReactionCollector({
time: duration || 24 * 60 * 60 * 1000,
filter: (reaction, user) => !user.bot && emojis.slice(0, options.length).includes(reaction.emoji.name)
});
collector.on('collect', (reaction, user) => {
const poll = activePolls.get(pollId);
if (!poll) return;
if (poll.voters.has(user.id)) {
reaction.users.remove(user.id);
return;
}
poll.voters.add(user.id);
poll.votes[reaction.emoji.name]++;
});
collector.on('end', async () => {
await this.endPoll(pollId, ctx.client);
});
} catch (error) {
logger.error(`Poll error: ${error.message}`);
await ctx.reply({ embeds: [createErrorEmbed(`Failed to create poll: ${error.message}`)] });
}
},
async endPoll(pollId, client) {
const poll = activePolls.get(pollId);
if (!poll) return;
try {
const channel = await client.channels.fetch(poll.channelId);
const message = await channel.messages.fetch(poll.messageId);
const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
let totalVotes = 0;
const results = [];
for (let i = 0; i < poll.options.length; i++) {
const count = poll.votes[emojis[i]] || 0;
totalVotes += count;
results.push({ option: poll.options[i], count, emoji: emojis[i] });
}
results.sort((a, b) => b.count - a.count);
let resultsText = '';
for (const r of results) {
const percentage = totalVotes > 0 ? Math.round((r.count / totalVotes) * 100) : 0;
const bar = '█'.repeat(Math.round(percentage / 10)) + '░'.repeat(10 - Math.round(percentage / 10));
resultsText += `${r.emoji} ${r.option}\n${bar} ${r.count} votes (${percentage}%)\n\n`;
}
const embed = new EmbedBuilder()
.setTitle('📊 Poll Ended: ' + poll.question)
.setDescription(resultsText)
.setColor(settings.colors.success)
.addFields({ name: '🏆 Winner', value: results[0]?.option || 'No votes', inline: true }, { name: '📈 Total Votes', value: totalVotes.toString(), inline: true })
.setFooter({ text: `Poll ID: ${pollId}` })
.setTimestamp();
await message.edit({ embeds: [embed] });
await message.reactions.removeAll();
activePolls.delete(pollId);
} catch (error) {
logger.error(`End poll error: ${error.message}`);
}
}
};
