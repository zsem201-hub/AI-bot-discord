// ==================== BOT SETTINGS ====================
require('dotenv').config();
module.exports = {
// Bot Configuration
prefix: process.env.PREFIX || '!',
ownerId: process.env.OWNER_ID,
ownerIds: (process.env.OWNER_IDS || process.env.OWNER_ID || '').split(',').filter(Boolean),
// AI Configuration
defaultProvider: process.env.DEFAULT_PROVIDER || 'gemini',
defaultModel: process.env.DEFAULT_MODEL || 'gemini-3-flash',
maxContextMessages: parseInt(process.env.MAX_CONTEXT_MESSAGES) || 50,
maxContextLength: parseInt(process.env.MAX_CONTEXT_LENGTH) || 32000,
// Rate Limits
rateLimits: {
user: { requests: parseInt(process.env.USER_RATE_LIMIT) || 30, per: 'hour' },
owner: { requests: 999999, per: 'hour' }
},
// TTS Configuration
tts: {
ownerVoice: process.env.ELEVENLABS_VOICE_ID || 'adam',
publicVoice: 'en-US-Standard-B',
maxLength: 5000
},
// Image Generation
imageGen: {
defaultModel: 'dall-e-3',
defaultSize: '1024x1024',
maxPromptLength: 1000
},
// Features Toggle
features: {
tts: process.env.FEATURE_TTS !== 'false',
imageGen: process.env.FEATURE_IMAGE_GEN !== 'false',
imageAnalysis: process.env.FEATURE_IMAGE_ANALYSIS !== 'false',
webSearch: process.env.FEATURE_WEB_SEARCH !== 'false',
codeExecution: process.env.FEATURE_CODE_EXEC === 'true',
reminders: process.env.FEATURE_REMINDERS !== 'false'
},
// Cooldowns (in seconds)
cooldowns: {
ai: 3,
image: 10,
tts: 5,
search: 5
},
// Embed Colors
colors: {
primary: '#5865F2',
success: '#00FF00',
error: '#FF0000',
warning: '#FFFF00',
info: '#0099FF'
},
// Logging
logLevel: process.env.LOG_LEVEL || 'info',
// Database
database: {
cleanupDays: parseInt(process.env.DB_CLEANUP_DAYS) || 30
},
// API Endpoints
apis: {
pollinations: 'https://text.pollinations.ai',
pollinationsImage: 'https://image.pollinations.ai/prompt',
openrouter: 'https://openrouter.ai/api/v1',
huggingface: 'https://api-inference.huggingface.co/models'
}
};
