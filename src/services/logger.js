// ==================== LOGGER SERVICE ====================
const fs = require('fs');
const path = require('path');
class Logger {
constructor() {
this.logDir = path.join(__dirname, '../../data/logs');
this.ensureLogDir();
this.levels = { error: 0, warn: 1, info: 2, debug: 3 };
this.currentLevel = process.env.LOG_LEVEL || 'info';
}
ensureLogDir() {
if (!fs.existsSync(this.logDir)) {
fs.mkdirSync(this.logDir, { recursive: true });
}
}
log(level, message, ...args) {
if (this.levels[level] > this.levels[this.currentLevel]) return;
const timestamp = new Date().toISOString();
const formattedMsg = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
console.log(formattedMsg, ...args);
const logFile = path.join(this.logDir, `${new Date().toISOString().split('T')[0]}.log`);
fs.appendFileSync(logFile, formattedMsg + (args.length ? ' ' + JSON.stringify(args) : '') + '\n');
}
error(message, ...args) { this.log('error', message, ...args); }
warn(message, ...args) { this.log('warn', message, ...args); }
info(message, ...args) { this.log('info', message, ...args); }
debug(message, ...args) { this.log('debug', message, ...args); }
}
module.exports = new Logger();
