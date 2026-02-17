// ==================== BOT SETTINGS ====================
require('dotenv').config();

module.exports = {
    // Bot Info
    botName: process.env.BOT_NAME || 'Toing',
    prefix: process.env.PREFIX || '!',
    ownerId: process.env.OWNER_ID,
    ownerIds: (process.env.OWNER_IDS || process.env.OWNER_ID || '').split(',').filter(Boolean),

    // AI Configuration - Default: Groq dengan Kimi K2
    defaultProvider: process.env.DEFAULT_PROVIDER || 'groq',
    defaultModel: process.env.DEFAULT_MODEL || 'moonshotai/kimi-k2-instruct-0905',
    maxContextMessages: parseInt(process.env.MAX_CONTEXT_MESSAGES) || 50,
    maxChannelContextMessages: parseInt(process.env.MAX_CHANNEL_CONTEXT_MESSAGES) || 100,

    // Bypass Channels
    bypassChannels: (process.env.BYPASS_CHANNELS || '').split(',').filter(Boolean),
    bypassSettings: {
        enabled: process.env.BYPASS_ENABLED !== 'false',
        multiUser: true,
        contextWindow: 100,
        cooldown: 800,
        ignorePrefix: true,
        maxResponseLength: 2000,
        systemPrompt: process.env.BYPASS_SYSTEM_PROMPT ||
            `Kamu adalah ${process.env.BOT_NAME || 'Toing'}, AI assistant yang ramah, santai, dan suka bercanda. ` +
            'Jawab singkat dan natural seperti teman ngobrol. ' +
            'Gunakan bahasa yang sama dengan user. Jangan terlalu formal.'
    },

    // Mention Settings
    mentionSettings: {
        enabled: true,
        respondToReply: true,
        contextFromChannel: false
    },

    // Response Format
    useEmbed: false,
    usePlainText: true,

    // Rate Limits
    rateLimits: {
        user: { requests: 50, per: 'hour' },
        channel: { requests: 100, per: 'hour' },
        owner: { requests: 999999, per: 'hour' }
    },

    // TTS
    tts: {
        maxLength: 500,
        ownerVoice: process.env.ELEVENLABS_VOICE_ID || 'o5s6XRBkPSTD4syv6mZg',
        publicVoice: process.env.TTS_VOICE || 'id-ID-Ardi'
    },

    // Notifications
    notificationChannelId: process.env.NOTIFICATION_CHANNEL_ID,

    // Server
    port: parseInt(process.env.PORT) || 3005,
    logLevel: process.env.LOG_LEVEL || 'info',

    // Features
    features: {
        tts: process.env.FEATURE_TTS !== 'false',
        imageGen: process.env.FEATURE_IMAGE_GEN !== 'false',
        imageAnalysis: process.env.FEATURE_IMAGE_ANALYSIS !== 'false',
        webSearch: process.env.FEATURE_WEB_SEARCH !== 'false',
        codeExecution: process.env.FEATURE_CODE_EXEC === 'true',
        reminders: process.env.FEATURE_REMINDERS !== 'false',
        music: process.env.FEATURE_MUSIC !== 'false'
    },

    // Database
    database: {
        cleanupDays: parseInt(process.env.DB_CLEANUP_DAYS) || 30
    },

    // Colors
    colors: {
        primary: '#5865F2',
        success: '#00FF00',
        error: '#FF0000',
        warning: '#FFA500'
    }
};
