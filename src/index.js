// ==================== MAIN ENTRY POINT ====================
require('dotenv').config();
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const logger = require('./services/logger');
const db = require('./services/database');
const events = require('./bot/events');
const settings = require('./config/settings');

// Optional: Music & Voice (load if available)
let MusicModule, VoiceManager, musicModule, voiceManager;

async function loadOptionalModules(client) {
    try {
        // Try to load Lavalink music
        const { Connectors } = require('shoukaku');
        const { Kazagumo } = require('kazagumo');
        VoiceManager = require('./voice/VoiceManager');

        const Nodes = [{
            name: process.env.LAVALINK_NAME || 'Main',
            url: process.env.LAVALINK_URL || 'lavalinkv4.serenetia.com:443',
            auth: process.env.LAVALINK_AUTH || 'https://dsc.gg/ajidevserver',
            secure: process.env.LAVALINK_SECURE !== 'false'
        }];

        const kazagumo = new Kazagumo({
            defaultSearchEngine: 'youtube',
            send: (guildId, payload) => {
                const guild = client.guilds.cache.get(guildId);
                if (guild) guild.shard.send(payload);
            }
        }, new Connectors.DiscordJS(client), Nodes, {
            moveOnDisconnect: false,
            resumable: false,
            reconnectTries: 3
        });

        kazagumo.shoukaku.on('ready', (name) => logger.info(`✅ Lavalink ${name} ready`));
        kazagumo.shoukaku.on('error', (name, err) => logger.error(`Lavalink ${name} error:`, err.message));

        voiceManager = new VoiceManager(client, kazagumo);

        // Load music module
        MusicModule = require('./music');
        musicModule = new MusicModule(client, kazagumo, voiceManager, db);
        
        logger.info('✅ Music & Voice modules loaded');
    } catch (e) {
        logger.warn('Music module not loaded:', e.message);
        logger.info('Bot will run without music features');
    }

    return { voiceManager, musicModule };
}

async function validateEnv() {
    const required = ['DISCORD_TOKEN', 'OWNER_ID'];
    const missing = required.filter(k => !process.env[k]);
    if (missing.length) throw new Error(`Missing env: ${missing.join(', ')}`);
}

async function main() {
    logger.info('========================================');
    logger.info('Starting Discord AI Bot...');
    logger.info('========================================');

    await validateEnv();

    // Create client
    const client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.GuildVoiceStates,
            GatewayIntentBits.MessageContent,
            GatewayIntentBits.DirectMessages,
            GatewayIntentBits.GuildMembers
        ],
        partials: [Partials.Channel, Partials.Message]
    });

    // Init database
    await db.init();
    logger.info('✅ Database ready');

    // Load optional modules
    const { voiceManager, musicModule } = await loadOptionalModules(client);

    // Register events
    events.register(client, { voiceManager, musicModule });

    // Login
    await client.login(process.env.DISCORD_TOKEN);

    logger.info('========================================');
    logger.info('🚀 Bot is running!');
    logger.info(`Prefix: ${settings.prefix}`);
    logger.info(`Bypass channels: ${settings.bypassChannels.length}`);
    logger.info('========================================');
}

// Graceful shutdown
process.on('SIGINT', () => { logger.info('Shutting down...'); process.exit(0); });
process.on('SIGTERM', () => { logger.info('Shutting down...'); process.exit(0); });
process.on('unhandledRejection', (err) => logger.error('Unhandled rejection:', err));

main().catch(err => { logger.error('Failed to start:', err); process.exit(1); });
