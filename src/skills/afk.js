// ==================== AFK SKILL ====================
const { createEmbed } = require('../utils/helpers');
const db = require('../services/database');
const logger = require('../services/logger');
const settings = require('../config/settings');
const afkUsers = new Map();
module.exports = {
name: 'afk',
description: 'Set AFK status',
usage: '!afk [reason]',
cooldown: 5,
async execute(ctx, args) {
const userId = ctx.author?.id || ctx.user?.id;
const username = ctx.author?.username || ctx.user?.username;
const reason = ctx.options?.getString('reason') || args.join(' ') || 'AFK';
if (afkUsers.has(userId)) {
const afkData = afkUsers.get(userId);
const duration = Date.now() - afkData.timestamp;
const durationStr = this.formatDuration(duration);
afkUsers.delete(userId);
const embed = createEmbed({
title: '👋 Welcome Back!',
description: `You were AFK for **${durationStr}**`,
color: settings.colors.success
});
await ctx.reply({ embeds: [embed] });
return;
}
afkUsers.set(userId, {
reason,
timestamp: Date.now(),
username
});
const embed = createEmbed({
title: '💤 AFK Set',
description: `**${username}** is now AFK: ${reason}`,
color: settings.colors.info,
footer: 'I\'ll let others know when they mention you'
});
await ctx.reply({ embeds: [embed] });
},
checkAFK(message) {
const userId = message.author?.id;
if (afkUsers.has(userId)) {
const afkData = afkUsers.get(userId);
const duration = Date.now() - afkData.timestamp;
const durationStr = this.formatDuration(duration);
afkUsers.delete(userId);
message.reply({
embeds: [createEmbed({
title: '👋 Welcome Back!',
description: `You were AFK for **${durationStr}**`,
color: settings.colors.success
})]
}).catch(() => {});
return;
}
const mentions = message.mentions.users;
if (mentions.size === 0) return;
mentions.forEach(user => {
if (afkUsers.has(user.id)) {
const afkData = afkUsers.get(user.id);
const duration = Date.now() - afkData.timestamp;
const durationStr = this.formatDuration(duration);
message.reply({
embeds: [createEmbed({
title: '💤 User is AFK',
description: `**${afkData.username}** is AFK: ${afkData.reason}`,
color: settings.colors.warning,
footer: `AFK since ${durationStr} ago`
})]
}).catch(() => {});
}
});
},
formatDuration(ms) {
const seconds = Math.floor(ms / 1000);
const minutes = Math.floor(seconds / 60);
const hours = Math.floor(minutes / 60);
const days = Math.floor(hours / 24);
if (days > 0) return `${days}d ${hours % 24}h`;
if (hours > 0) return `${hours}h ${minutes % 60}m`;
if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
return `${seconds}s`;
},
getAFKUser(userId) {
return afkUsers.get(userId);
},
isAFK(userId) {
return afkUsers.has(userId);
}
};
