// ==================== REMINDER SKILL ====================
const { createEmbed, createErrorEmbed, parseTime, formatDuration } = require('../utils/helpers');
const db = require('../services/database');
const logger = require('../services/logger');
const settings = require('../config/settings');
module.exports = {
name: 'reminder',
description: 'Set reminders',
usage: '!remind <time> <message>',
cooldown: 5,
async execute(ctx, args) {
const subcommand = ctx.options?.getSubcommand?.() || args[0]?.toLowerCase();
const userId = ctx.author?.id || ctx.user?.id;
if (subcommand === 'list' || args[0]?.toLowerCase() === 'list') {
const reminders = db.getUserReminders(userId);
if (reminders.length === 0) {
await ctx.reply({ embeds: [createEmbed({ title: '⏰ Your Reminders', description: 'No active reminders.', color: settings.colors.info })] });
return;
}
let description = '';
for (const r of reminders.slice(0, 10)) {
const timeLeft = r.remind_at * 1000 - Date.now();
const timeStr = timeLeft > 0 ? formatDuration(timeLeft) : 'Soon!';
description += `**#${r.id}** - ${r.message.substring(0, 50)}${r.message.length > 50 ? '...' : ''}\n⏱️ In: ${timeStr}\n\n`;
}
const embed = createEmbed({ title: '⏰ Your Reminders', description, color: settings.colors.primary, footer: `${reminders.length} active reminder(s) | Use !remind delete <id> to remove` });
await ctx.reply({ embeds: [embed] });
return;
}
if (subcommand === 'delete' || args[0]?.toLowerCase() === 'delete') {
const id = ctx.options?.getInteger('id') || parseInt(args[1]);
if (!id || isNaN(id)) {
await ctx.reply({ embeds: [createErrorEmbed('Please provide reminder ID!\nUsage: `!remind delete <id>`')] });
return;
}
const success = db.deleteReminder(id, userId);
if (success) {
await ctx.reply({ embeds: [createEmbed({ title: '✅ Reminder Deleted', description: `Reminder #${id} has been deleted.`, color: settings.colors.success })] });
} else {
await ctx.reply({ embeds: [createErrorEmbed('Reminder not found or you don\'t have permission to delete it.')] });
}
return;
}
const timeStr = ctx.options?.getString('time') || args[0];
const message = ctx.options?.getString('message') || args.slice(1).join(' ');
if (!timeStr || !message) {
const helpEmbed = createEmbed({
title: '⏰ Reminder Help',
description: 'Set reminders to be notified later',
color: settings.colors.info,
fields: [
{ name: 'Set Reminder', value: '`!remind <time> <message>`' },
{ name: 'List Reminders', value: '`!remind list`' },
{ name: 'Delete Reminder', value: '`!remind delete <id>`' },
{ name: 'Time Format', value: '`30s` - seconds\n`5m` - minutes\n`2h` - hours\n`1d` - days\n`1w` - weeks' },
{ name: 'Examples', value: '`!remind 30m Check oven`\n`!remind 2h Take a break`\n`!remind 1d Pay bills`' }
]
});
await ctx.reply({ embeds: [helpEmbed] });
return;
}
const duration = parseTime(timeStr);
if (!duration) {
await ctx.reply({ embeds: [createErrorEmbed('Invalid time format!\n\nUse: `30s`, `5m`, `2h`, `1d`, `1w`')] });
return;
}
if (duration < 30000) {
await ctx.reply({ embeds: [createErrorEmbed('Minimum reminder time is 30 seconds.')] });
return;
}
if (duration > 30 * 24 * 60 * 60 * 1000) {
await ctx.reply({ embeds: [createErrorEmbed('Maximum reminder time is 30 days.')] });
return;
}
if (message.length > 500) {
await ctx.reply({ embeds: [createErrorEmbed('Reminder message too long! Maximum 500 characters.')] });
return;
}
const remindAt = Date.now() + duration;
const userReminders = db.getUserReminders(userId);
if (userReminders.length >= 10) {
await ctx.reply({ embeds: [createErrorEmbed('You have reached the maximum of 10 active reminders.\nDelete some reminders first with `!remind list` and `!remind delete <id>`')] });
return;
}
try {
const id = db.addReminder(userId, ctx.channel.id, message, remindAt);
const embed = createEmbed({
title: '⏰ Reminder Set!',
description: `I'll remind you in **${formatDuration(duration)}**`,
color: settings.colors.success,
fields: [
{ name: 'Message', value: message },
{ name: 'Reminder ID', value: `#${id}`, inline: true },
{ name: 'Time', value: `<t:${Math.floor(remindAt / 1000)}:R>`, inline: true }
],
footer: 'Use !remind list to see all reminders'
});
await ctx.reply({ embeds: [embed] });
} catch (error) {
logger.error(`Reminder error: ${error.message}`);
await ctx.reply({ embeds: [createErrorEmbed(`Failed to set reminder: ${error.message}`)] });
}
}
};
