// ==================== BOT SETTINGS ====================
require('dotenv').config();

module.exports = {
    // Bot
    prefix: process.env.PREFIX || '!',
    ownerId: process.env.OWNER_ID,
    ownerIds: (process.env.OWNER_IDS || process.env.OWNER_ID || '').split(',').filter(Boolean),

    // AI
    defaultProvider: process.env.DEFAULT_PROVIDER || 'gemini',
    defaultModel: process.env.DEFAULT_MODEL || 'gemini-2.0-flash',
    maxContextMessages: 30,
    maxChannelContextMessages: 50,

    // Bypass Channels - Bot auto-reply tanpa command/mention
    bypassChannels: (process.env.BYPASS_CHANNELS || '').split(',').filter(Boolean),
    
    // Bypass channel settings
    bypassSettings: {
        enabled: process.env.BYPASS_ENABLED !== 'false',
        multiUser: true,           // Read all users in channel
        contextWindow: 50,         // Messages to remember
        cooldown: 1000,            // Min ms between responses
        ignorePrefix: true,        // Ignore messages starting with prefix
        maxResponseLength: 2000,   // Max response chars
        systemPrompt: process.env.BYPASS_SYSTEM_PROMPT || 
            'Kamu adalah AI assistant yang ramah dalam grup chat. ' +
            'Baca semua pesan dari berbagai user dan berikan respons yang relevan. ' +
            'Jawab singkat dan natural seperti teman ngobrol. ' +
            'Jika ada diskusi, ikuti topik pembicaraan. ' +
            'Gunakan bahasa yang sama dengan user.'
    },

    // Mention settings
    mentionSettings: {
        enabled: true,
        respondToReply: true,      // Respond when someone replies to bot
        contextFromChannel: false   // Use channel context instead of DM-style
    },

    // Response format
    useEmbed: false,  // FALSE = plain text only
    usePlainText: true,

    // Rate limits
    rateLimits: {
        user: { requests: 30, per: 'hour' },
        channel: { requests: 60, per: 'hour' },
        owner: { requests: 999999, per: 'hour' }
    },

    // TTS
    tts: {
        maxLength: 500,
        ownerVoice: process.env.ELEVENLABS_VOICE_ID || 'adam'
    },

    // Colors (for embed if ever needed)
    colors: {
        primary: '#5865F2',
        success: '#00FF00',
        error: '#FF0000'
    }
};
