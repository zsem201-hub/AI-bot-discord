// ==================== SKILL LOADER ====================
const fs = require('fs');
const path = require('path');
const logger = require('../services/logger');
const settings = require('../config/settings');
class SkillManager {
constructor() {
this.skills = new Map();
this.loadSkills();
}
loadSkills() {
const skillFiles = fs.readdirSync(__dirname).filter(file => file.endsWith('.js') && file !== 'index.js');
for (const file of skillFiles) {
try {
const skill = require(path.join(__dirname, file));
const skillName = file.replace('.js', '').replace(/-/g, '');
if (skill.name && skill.execute) {
if (this.isSkillEnabled(skill.name)) {
this.skills.set(skill.name, skill);
logger.debug(`Loaded skill: ${skill.name}`);
} else {
logger.debug(`Skill disabled: ${skill.name}`);
}
}
} catch (error) {
logger.error(`Failed to load skill ${file}: ${error.message}`);
}
}
logger.info(`Loaded ${this.skills.size} skills`);
}
isSkillEnabled(skillName) {
const featureMap = {
tts: settings.features.tts,
imageGen: settings.features.imageGen,
imageAnalyze: settings.features.imageAnalysis,
search: settings.features.webSearch,
code: settings.features.codeExecution,
reminder: settings.features.reminders
};
return featureMap[skillName] !== false;
}
get(skillName) {
return this.skills.get(skillName);
}
has(skillName) {
return this.skills.has(skillName);
}
getAll() {
return Array.from(this.skills.values());
}
async execute(skillName, ctx, args) {
const skill = this.skills.get(skillName);
if (!skill) throw new Error(`Skill ${skillName} not found`);
return await skill.execute(ctx, args);
}
}
const manager = new SkillManager();
module.exports = {
tts: manager.get('tts'),
imageGen: manager.get('imageGen'),
imageAnalyze: manager.get('imageAnalyze'),
search: manager.get('search'),
calculator: manager.get('calculator'),
weather: manager.get('weather'),
translate: manager.get('translate'),
crypto: manager.get('crypto'),
reminder: manager.get('reminder'),
wiki: manager.get('wiki'),
news: manager.get('news'),
code: manager.get('code'),
manager
};
