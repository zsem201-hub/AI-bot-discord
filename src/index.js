// ==================== MAIN ENTRY POINT ====================
require('dotenv').config();
const logger = require('./services/logger');
const db = require('./services/database');
const bot = require('./bot/client');
const settings = require('./config/settings');
async function validateEnv() {
const required = ['DISCORD_TOKEN', 'OWNER_ID'];
const missing = required.filter(key => !process.env[key]);
if (missing.length > 0) {
throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
}
const apiKeys = ['GEMINI_API_KEY', 'GROQ_API_KEY', 'OPENROUTER_API_KEY'];
const hasApiKey = apiKeys.some(key => process.env[key]);
if (!hasApiKey) {
logger.warn('No AI provider API keys found. Only Pollinations (free) will work.');
}
}
async function startSchedulers() {
const db = require('./services/database');
setInterval(async () => {
try {
const reminders = db.getDueReminders();
const client = bot.getClient();
for (const reminder of reminders) {
try {
const channel = await client.channels.fetch(reminder.channel_id);
if (channel) {
await channel.send(`⏰ <@${reminder.user_id}> Reminder: ${reminder.message}`);
}
db.completeReminder(reminder.id);
} catch (err) {
logger.error(`Failed to send reminder: ${err.message}`);
db.completeReminder(reminder.id);
}
}
} catch (error) {
logger.error(`Reminder scheduler error: ${error.message}`);
}
}, 60000);
setInterval(() => {
db.cleanOldData(settings.database.cleanupDays);
}, 86400000);
logger.info('Schedulers started');
}
async function gracefulShutdown(signal) {
logger.info(`Received ${signal}, shutting down gracefully...`);
try {
await bot.stop();
db.close();
logger.info('Shutdown complete');
process.exit(0);
} catch (error) {
logger.error('Error during shutdown:', error);
process.exit(1);
}
}
async function main() {
try {
logger.info('========================================');
logger.info('Starting Discord AI Bot...');
logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
logger.info('========================================');
await validateEnv();
logger.info('✅ Environment validated');
await db.init();
logger.info('✅ Database initialized');
await bot.start();
logger.info('✅ Bot started');
await startSchedulers();
logger.info('✅ Schedulers started');
logger.info('========================================');
logger.info('🚀 Bot is now running!');
logger.info(`📌 Prefix: ${settings.prefix}`);
logger.info(`🤖 Default model: ${settings.defaultModel}`);
logger.info('========================================');
} catch (error) {
logger.error('Failed to start bot:', error);
process.exit(1);
}
}
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('unhandledRejection', (reason, promise) => {
logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (error) => {
logger.error('Uncaught Exception:', error);
gracefulShutdown('uncaughtException');
});
main();
