// Parse & route commands
const aiManager = require('../ai/manager');
const skills = require('../skills');
const { isOwner } = require('../utils/permissions');

const commandMap = {
  // AI Commands
  'ai': handleAI,
  'model': handleModel,
  'reset': handleReset,
  
  // Skill Commands
  'tts': skills.tts.execute,
  'img': skills.imageGen.execute,
  'analyze': skills.imageAnalyze.execute,
  'search': skills.search.execute,
  'calc': skills.calculator.execute,
  'weather': skills.weather.execute,
  'crypto': skills.crypto.execute,
  
  // Admin Commands
  'help': handleHelp,
  'stats': handleStats
};

async function handle(message) {
  const args = message.content.slice(1).trim().split(/ +/);
  const command = args.shift().toLowerCase();
  
  const handler = commandMap[command];
  if (!handler) return;
  
  try {
    await handler(message, args);
  } catch (error) {
    await message.reply('❌ Error: ' + error.message);
  }
}

async function handleAI(message, args) {
  const query = args.join(' ');
  const response = await aiManager.chat({
    message: query,
    userId: message.author.id,
    channelId: message.channel.id
  });
  
  await message.reply(response);
}

module.exports = { handle, handleSlash };
