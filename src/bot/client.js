// ==================== DISCORD BOT CLIENT ====================
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const logger = require('../services/logger');
const events = require('./events');
const commands = require('./commands');
class DiscordBot {
constructor() {
this.client = new Client({
intents: [
GatewayIntentBits.Guilds,
GatewayIntentBits.GuildMessages,
GatewayIntentBits.GuildVoiceStates,
GatewayIntentBits.MessageContent,
GatewayIntentBits.DirectMessages,
GatewayIntentBits.GuildMembers
],
partials: [
Partials.Channel,
Partials.Message
]
});
this.commands = new Collection();
this.cooldowns = new Collection();
this.setupClient();
}
setupClient() {
events.register(this.client);
this.client.commands = this.commands;
this.client.cooldowns = this.cooldowns;
commands.loadCommands(this.client);
process.on('unhandledRejection', error => {
logger.error('Unhandled promise rejection:', error);
});
process.on('uncaughtException', error => {
logger.error('Uncaught exception:', error);
});
}
async start() {
try {
await this.client.login(process.env.DISCORD_TOKEN);
logger.info('Bot logged in successfully');
return this.client;
} catch (error) {
logger.error('Failed to login:', error);
throw error;
}
}
async stop() {
logger.info('Stopping bot...');
this.client.destroy();
}
getClient() {
return this.client;
}
}
module.exports = new DiscordBot();
