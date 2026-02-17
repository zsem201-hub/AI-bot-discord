// ==================== DATABASE SERVICE ====================
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const logger = require('./logger');
class DatabaseService {
constructor() {
this.dbPath = path.join(__dirname, '../../data/database.db');
this.db = null;
}
async init() {
try {
const dataDir = path.dirname(this.dbPath);
if (!fs.existsSync(dataDir)) {
fs.mkdirSync(dataDir, { recursive: true });
}
this.db = new Database(this.dbPath);
this.db.pragma('journal_mode = WAL');
this.createTables();
logger.info('Database initialized successfully');
return true;
} catch (error) {
logger.error('Database initialization failed:', error);
throw error;
}
}
createTables() {
this.db.exec(`
CREATE TABLE IF NOT EXISTS users (
id TEXT PRIMARY KEY,
username TEXT,
provider TEXT DEFAULT 'gemini',
model TEXT DEFAULT 'gemini-3-flash',
system_prompt TEXT,
temperature REAL DEFAULT 0.7,
language TEXT DEFAULT 'en',
created_at INTEGER DEFAULT (strftime('%s', 'now')),
updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);
CREATE TABLE IF NOT EXISTS conversations (
id INTEGER PRIMARY KEY AUTOINCREMENT,
user_id TEXT NOT NULL,
channel_id TEXT NOT NULL,
role TEXT NOT NULL,
content TEXT NOT NULL,
timestamp INTEGER DEFAULT (strftime('%s', 'now')),
FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_conversations_user_channel ON conversations(user_id, channel_id);
CREATE INDEX IF NOT EXISTS idx_conversations_timestamp ON conversations(timestamp);
CREATE TABLE IF NOT EXISTS usage_logs (
id INTEGER PRIMARY KEY AUTOINCREMENT,
user_id TEXT NOT NULL,
provider TEXT NOT NULL,
model TEXT NOT NULL,
tokens INTEGER DEFAULT 0,
duration INTEGER DEFAULT 0,
success INTEGER DEFAULT 1,
timestamp INTEGER DEFAULT (strftime('%s', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_usage_user ON usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_timestamp ON usage_logs(timestamp);
CREATE TABLE IF NOT EXISTS reminders (
id INTEGER PRIMARY KEY AUTOINCREMENT,
user_id TEXT NOT NULL,
channel_id TEXT NOT NULL,
message TEXT NOT NULL,
remind_at INTEGER NOT NULL,
created_at INTEGER DEFAULT (strftime('%s', 'now')),
completed INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_reminders_time ON reminders(remind_at, completed);
CREATE TABLE IF NOT EXISTS blacklist (
id TEXT PRIMARY KEY,
reason TEXT,
created_at INTEGER DEFAULT (strftime('%s', 'now'))
);
CREATE TABLE IF NOT EXISTS guild_settings (
guild_id TEXT PRIMARY KEY,
prefix TEXT DEFAULT '!',
welcome_channel TEXT,
welcome_message TEXT,
log_channel TEXT,
auto_role TEXT,
settings TEXT DEFAULT '{}',
created_at INTEGER DEFAULT (strftime('%s', 'now')),
updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);
`);
}
// ==================== USER METHODS ====================
getUserPreferences(userId) {
try {
const row = this.db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
if (!row) return null;
return {
provider: row.provider,
model: row.model,
systemPrompt: row.system_prompt,
temperature: row.temperature,
language: row.language
};
} catch (error) {
logger.error(`Get user preferences error: ${error.message}`);
return null;
}
}
saveUserPreferences(userId, prefs) {
try {
const existing = this.db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
if (existing) {
this.db.prepare(`
UPDATE users SET provider = ?, model = ?, system_prompt = ?, temperature = ?, language = ?, updated_at = strftime('%s', 'now')
WHERE id = ?
`).run(prefs.provider, prefs.model, prefs.systemPrompt, prefs.temperature, prefs.language, userId);
} else {
this.db.prepare(`
INSERT INTO users (id, provider, model, system_prompt, temperature, language)
VALUES (?, ?, ?, ?, ?, ?)
`).run(userId, prefs.provider, prefs.model, prefs.systemPrompt, prefs.temperature, prefs.language);
}
return true;
} catch (error) {
logger.error(`Save user preferences error: ${error.message}`);
return false;
}
}
// ==================== CONVERSATION METHODS ====================
getConversationHistory(userId, channelId, limit = 50) {
try {
const rows = this.db.prepare(`
SELECT role, content, timestamp FROM conversations
WHERE user_id = ? AND channel_id = ?
ORDER BY timestamp DESC LIMIT ?
`).all(userId, channelId, limit);
return rows.reverse().map(row => ({
role: row.role,
content: row.content,
timestamp: row.timestamp * 1000
}));
} catch (error) {
logger.error(`Get conversation history error: ${error.message}`);
return [];
}
}
saveMessage(userId, channelId, message) {
try {
this.db.prepare(`
INSERT INTO conversations (user_id, channel_id, role, content)
VALUES (?, ?, ?, ?)
`).run(userId, channelId, message.role, message.content);
return true;
} catch (error) {
logger.error(`Save message error: ${error.message}`);
return false;
}
}
clearConversation(userId, channelId) {
try {
this.db.prepare('DELETE FROM conversations WHERE user_id = ? AND channel_id = ?').run(userId, channelId);
return true;
} catch (error) {
logger.error(`Clear conversation error: ${error.message}`);
return false;
}
}
// ==================== USAGE LOG METHODS ====================
logUsage(data) {
try {
this.db.prepare(`
INSERT INTO usage_logs (user_id, provider, model, tokens, duration, success)
VALUES (?, ?, ?, ?, ?, ?)
`).run(data.userId, data.provider, data.model, data.tokens, data.duration, data.success ? 1 : 0);
return true;
} catch (error) {
logger.error(`Log usage error: ${error.message}`);
return false;
}
}
getUsageStats(userId = null, period = 'day') {
try {
const periodSeconds = { hour: 3600, day: 86400, week: 604800, month: 2592000 };
const since = Math.floor(Date.now() / 1000) - (periodSeconds[period] || periodSeconds.day);
let query, params;
if (userId) {
query = `SELECT COUNT(*) as total, SUM(tokens) as tokens, SUM(duration) as duration FROM usage_logs WHERE user_id = ? AND timestamp >= ?`;
params = [userId, since];
} else {
query = `SELECT COUNT(*) as total, SUM(tokens) as tokens, SUM(duration) as duration FROM usage_logs WHERE timestamp >= ?`;
params = [since];
}
const row = this.db.prepare(query).get(...params);
const todayStart = Math.floor(new Date().setHours(0, 0, 0, 0) / 1000);
const todayRow = this.db.prepare(`SELECT COUNT(*) as total FROM usage_logs WHERE timestamp >= ?`).get(todayStart);
return {
totalRequests: row?.total || 0,
totalTokens: row?.tokens || 0,
totalDuration: row?.duration || 0,
todayRequests: todayRow?.total || 0
};
} catch (error) {
logger.error(`Get usage stats error: ${error.message}`);
return { totalRequests: 0, totalTokens: 0, todayRequests: 0 };
}
}
getUsageByProvider(period = 'day') {
try {
const periodSeconds = { hour: 3600, day: 86400, week: 604800, month: 2592000 };
const since = Math.floor(Date.now() / 1000) - (periodSeconds[period] || periodSeconds.day);
return this.db.prepare(`
SELECT provider, COUNT(*) as requests, SUM(tokens) as tokens
FROM usage_logs WHERE timestamp >= ?
GROUP BY provider ORDER BY requests DESC
`).all(since);
} catch (error) {
logger.error(`Get usage by provider error: ${error.message}`);
return [];
}
}
// ==================== REMINDER METHODS ====================
addReminder(userId, channelId, message, remindAt) {
try {
const result = this.db.prepare(`
INSERT INTO reminders (user_id, channel_id, message, remind_at)
VALUES (?, ?, ?, ?)
`).run(userId, channelId, message, Math.floor(remindAt / 1000));
return result.lastInsertRowid;
} catch (error) {
logger.error(`Add reminder error: ${error.message}`);
return null;
}
}
getDueReminders() {
try {
const now = Math.floor(Date.now() / 1000);
return this.db.prepare(`
SELECT * FROM reminders WHERE remind_at <= ? AND completed = 0
`).all(now);
} catch (error) {
logger.error(`Get due reminders error: ${error.message}`);
return [];
}
}
completeReminder(id) {
try {
this.db.prepare('UPDATE reminders SET completed = 1 WHERE id = ?').run(id);
return true;
} catch (error) {
logger.error(`Complete reminder error: ${error.message}`);
return false;
}
}
getUserReminders(userId) {
try {
return this.db.prepare(`
SELECT * FROM reminders WHERE user_id = ? AND completed = 0 ORDER BY remind_at ASC
`).all(userId);
} catch (error) {
logger.error(`Get user reminders error: ${error.message}`);
return [];
}
}
deleteReminder(id, userId) {
try {
this.db.prepare('DELETE FROM reminders WHERE id = ? AND user_id = ?').run(id, userId);
return true;
} catch (error) {
logger.error(`Delete reminder error: ${error.message}`);
return false;
}
}
// ==================== BLACKLIST METHODS ====================
isBlacklisted(userId) {
try {
const row = this.db.prepare('SELECT id FROM blacklist WHERE id = ?').get(userId);
return !!row;
} catch (error) {
logger.error(`Check blacklist error: ${error.message}`);
return false;
}
}
addToBlacklist(userId, reason = null) {
try {
this.db.prepare('INSERT OR REPLACE INTO blacklist (id, reason) VALUES (?, ?)').run(userId, reason);
return true;
} catch (error) {
logger.error(`Add to blacklist error: ${error.message}`);
return false;
}
}
removeFromBlacklist(userId) {
try {
this.db.prepare('DELETE FROM blacklist WHERE id = ?').run(userId);
return true;
} catch (error) {
logger.error(`Remove from blacklist error: ${error.message}`);
return false;
}
}
// ==================== GUILD SETTINGS METHODS ====================
getGuildSettings(guildId) {
try {
const row = this.db.prepare('SELECT * FROM guild_settings WHERE guild_id = ?').get(guildId);
if (!row) return null;
return {
prefix: row.prefix,
welcomeChannel: row.welcome_channel,
welcomeMessage: row.welcome_message,
logChannel: row.log_channel,
autoRole: row.auto_role,
settings: JSON.parse(row.settings || '{}')
};
} catch (error) {
logger.error(`Get guild settings error: ${error.message}`);
return null;
}
}
saveGuildSettings(guildId, settings) {
try {
const existing = this.db.prepare('SELECT guild_id FROM guild_settings WHERE guild_id = ?').get(guildId);
if (existing) {
this.db.prepare(`
UPDATE guild_settings SET prefix = ?, welcome_channel = ?, welcome_message = ?, log_channel = ?, auto_role = ?, settings = ?, updated_at = strftime('%s', 'now')
WHERE guild_id = ?
`).run(settings.prefix, settings.welcomeChannel, settings.welcomeMessage, settings.logChannel, settings.autoRole, JSON.stringify(settings.settings || {}), guildId);
} else {
this.db.prepare(`
INSERT INTO guild_settings (guild_id, prefix, welcome_channel, welcome_message, log_channel, auto_role, settings)
VALUES (?, ?, ?, ?, ?, ?, ?)
`).run(guildId, settings.prefix, settings.welcomeChannel, settings.welcomeMessage, settings.logChannel, settings.autoRole, JSON.stringify(settings.settings || {}));
}
return true;
} catch (error) {
logger.error(`Save guild settings error: ${error.message}`);
return false;
}
}
// ==================== UTILITY METHODS ====================
vacuum() {
try {
this.db.exec('VACUUM');
logger.info('Database vacuumed');
} catch (error) {
logger.error(`Vacuum error: ${error.message}`);
}
}
close() {
if (this.db) {
this.db.close();
logger.info('Database connection closed');
}
}
getStats() {
try {
const users = this.db.prepare('SELECT COUNT(*) as count FROM users').get();
const conversations = this.db.prepare('SELECT COUNT(*) as count FROM conversations').get();
const usageLogs = this.db.prepare('SELECT COUNT(*) as count FROM usage_logs').get();
const reminders = this.db.prepare('SELECT COUNT(*) as count FROM reminders WHERE completed = 0').get();
return {
users: users.count,
conversations: conversations.count,
usageLogs: usageLogs.count,
activeReminders: reminders.count
};
} catch (error) {
logger.error(`Get stats error: ${error.message}`);
return {};
}
}
cleanOldData(daysToKeep = 30) {
try {
const cutoff = Math.floor(Date.now() / 1000) - (daysToKeep * 86400);
const convResult = this.db.prepare('DELETE FROM conversations WHERE timestamp < ?').run(cutoff);
const logResult = this.db.prepare('DELETE FROM usage_logs WHERE timestamp < ?').run(cutoff);
const reminderResult = this.db.prepare('DELETE FROM reminders WHERE completed = 1 AND remind_at < ?').run(cutoff);
logger.info(`Cleaned: ${convResult.changes} conversations, ${logResult.changes} logs, ${reminderResult.changes} reminders`);
return true;
} catch (error) {
logger.error(`Clean old data error: ${error.message}`);
return false;
}
}
}
module.exports = new DatabaseService();
