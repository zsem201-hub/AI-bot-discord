// ==================== DISCORD EVENTS ====================
const { Events, ActivityType } = require('discord.js');
const logger = require('../services/logger');
const commands = require('./commands');
const settings = require('../config/settings');
module.exports = {
register(client) {
client.once(Events.ClientReady, async (c) => {
logger.info(`✅ Bot is ready! Logged in as ${c.user.tag}`);
logger.info(`📊 Serving ${c.guilds.cache.size} guilds`);
client.user.setPresence({
activities: [{ 
name: `${settings.prefix}help | AI Assistant`,
type: ActivityType.Watching 
}],
status: 'online'
});
await commands.registerSlashCommands(client);
});
client.on(Events.MessageCreate, async (message) => {
if (message.author.bot) return;
if (message.content.startsWith(settings.prefix)) {
await commands.handleTextCommand(message);
}
});
client.on(Events.InteractionCreate, async (interaction) => {
if (interaction.isChatInputCommand()) {
await commands.handleSlashCommand(interaction);
} else if (interaction.isAutocomplete()) {
await commands.handleAutocomplete(interaction);
}
});
client.on(Events.Error, error => {
logger.error('Discord client error:', error);
});
client.on(Events.Warn, info => {
logger.warn('Discord client warning:', info);
});
client.on(Events.GuildCreate, guild => {
logger.info(`Joined new guild: ${guild.name} (${guild.id})`);
});
client.on(Events.GuildDelete, guild => {
logger.info(`Left guild: ${guild.name} (${guild.id})`);
});
client.on(Events.MessageDelete, async (message) => {
if (message.author?.bot) return;
logger.debug(`Message deleted in ${message.guild?.name}: ${message.content?.substring(0, 50)}`);
});
}
};
