// ==================== COMMAND HANDLER ====================
const { REST, Routes, SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const aiManager = require('../ai/manager');
const skills = require('../skills');
const { isOwner, hasPermission } = require('../utils/permissions');
const settings = require('../config/settings');
const logger = require('../services/logger');
const commandDefinitions = {
ai: {
name: 'ai',
description: 'Chat with AI',
options: [{type: 3, name: 'message', description: 'Your message', required: true}, {type: 3, name: 'model', description: 'AI model to use', required: false}],
execute: async (ctx, args) => {
const message = args[0] || args.message;
const model = args[1] || args.model;
await ctx.deferReply?.() || ctx.channel.sendTyping();
try {
const response = await aiManager.chat({
message,
userId: ctx.author?.id || ctx.user?.id,
channelId: ctx.channel.id,
model
});
const embed = new EmbedBuilder()
.setColor('#0099ff')
.setDescription(response.text.substring(0, 4000))
.setFooter({ text: `Model: ${response.model} | Tokens: ${response.tokens} | ${response.duration}ms` });
await (ctx.editReply ? ctx.editReply({ embeds: [embed] }) : ctx.reply({ embeds: [embed] }));
} catch (error) {
logger.error(`AI command error: ${error.message}`);
await (ctx.editReply ? ctx.editReply({ content: `❌ Error: ${error.message}` }) : ctx.reply(`❌ Error: ${error.message}`));
}
}
},
model: {
name: 'model',
description: 'Manage AI models',
options: [
{type: 1, name: 'list', description: 'List available models'},
{type: 1, name: 'set', description: 'Set your default model', options: [{type: 3, name: 'model', description: 'Model ID', required: true}, {type: 3, name: 'provider', description: 'Provider', required: false}]},
{type: 1, name: 'current', description: 'Show current model'},
{type: 1, name: 'info', description: 'Get model information', options: [{type: 3, name: 'model', description: 'Model ID', required: true}]}
],
execute: async (ctx, args) => {
const subcommand = ctx.options?.getSubcommand?.() || args[0];
const userId = ctx.author?.id || ctx.user?.id;
if (subcommand === 'list') {
const models = aiManager.getModels();
const embed = new EmbedBuilder()
.setTitle('📋 Available AI Models')
.setColor('#00ff00')
.setDescription('Use `/model set <model>` to change your default model');
for (const [provider, data] of Object.entries(models)) {
const modelList = data.models.slice(0, 10).map(m => `\`${m.id}\``).join(', ');
const more = data.models.length > 10 ? `\n... and ${data.models.length - 10} more` : '';
embed.addFields({ name: `${data.name} (${data.models.length} models)`, value: modelList + more });
}
await ctx.reply({ embeds: [embed] });
} else if (subcommand === 'set') {
const model = ctx.options?.getString('model') || args[1];
const provider = ctx.options?.getString('provider') || args[2];
try {
const result = await aiManager.switchModel(userId, model, provider);
await ctx.reply(`✅ Model changed to **${result.model}** (${result.provider})`);
} catch (error) {
await ctx.reply(`❌ Error: ${error.message}`);
}
} else if (subcommand === 'current') {
const prefs = await aiManager.getUserPreferences(userId);
await ctx.reply(`📌 Current model: **${prefs.model}** (${prefs.provider})`);
} else if (subcommand === 'info') {
const model = ctx.options?.getString('model') || args[1];
const modelInfo = aiManager.findModel(model);
if (!modelInfo) {
await ctx.reply('❌ Model not found');
return;
}
const embed = new EmbedBuilder()
.setTitle(`ℹ️ ${modelInfo.name}`)
.setColor('#0099ff')
.addFields(
{ name: 'ID', value: `\`${modelInfo.id}\``, inline: true },
{ name: 'Version', value: modelInfo.version, inline: true },
{ name: 'Category', value: modelInfo.category || 'general', inline: true },
{ name: 'Provider', value: modelInfo.providerName, inline: true }
);
await ctx.reply({ embeds: [embed] });
}
}
},
reset: {
name: 'reset',
description: 'Reset conversation context',
execute: async (ctx) => {
const userId = ctx.author?.id || ctx.user?.id;
await aiManager.resetContext(userId, ctx.channel.id);
await ctx.reply('✅ Conversation context has been reset');
}
},
system: {
name: 'system',
description: 'Set system prompt',
options: [{type: 3, name: 'prompt', description: 'System prompt (leave empty to clear)', required: false}],
execute: async (ctx, args) => {
const userId = ctx.author?.id || ctx.user?.id;
const prompt = ctx.options?.getString('prompt') || args[0];
if (!prompt) {
await aiManager.setSystemPrompt(userId, null);
await ctx.reply('✅ System prompt cleared');
} else {
await aiManager.setSystemPrompt(userId, prompt);
await ctx.reply(`✅ System prompt set to: ${prompt.substring(0, 100)}...`);
}
}
},
tts: {
name: 'tts',
description: 'Text to speech',
options: [{type: 3, name: 'text', description: 'Text to convert', required: true}],
execute: async (ctx, args) => {
await skills.tts.execute(ctx, args);
}
},
img: {
name: 'img',
description: 'Generate image',
options: [{type: 3, name: 'prompt', description: 'Image description', required: true}, {type: 3, name: 'style', description: 'Art style', required: false}],
execute: async (ctx, args) => {
await skills.imageGen.execute(ctx, args);
}
},
analyze: {
name: 'analyze',
description: 'Analyze image',
options: [{type: 11, name: 'image', description: 'Image to analyze', required: false}, {type: 3, name: 'prompt', description: 'What to analyze', required: false}],
execute: async (ctx, args) => {
await skills.imageAnalyze.execute(ctx, args);
}
},
search: {
name: 'search',
description: 'Web search',
options: [{type: 3, name: 'query', description: 'Search query', required: true}],
execute: async (ctx, args) => {
await skills.search.execute(ctx, args);
}
},
calc: {
name: 'calc',
description: 'Calculator',
options: [{type: 3, name: 'expression', description: 'Math expression', required: true}],
execute: async (ctx, args) => {
await skills.calculator.execute(ctx, args);
}
},
weather: {
name: 'weather',
description: 'Get weather info',
options: [{type: 3, name: 'location', description: 'City name', required: true}],
execute: async (ctx, args) => {
await skills.weather.execute(ctx, args);
}
},
translate: {
name: 'translate',
description: 'Translate text',
options: [{type: 3, name: 'to', description: 'Target language (e.g., id, en)', required: true}, {type: 3, name: 'text', description: 'Text to translate', required: true}],
execute: async (ctx, args) => {
await skills.translate.execute(ctx, args);
}
},
crypto: {
name: 'crypto',
description: 'Get crypto prices',
options: [{type: 3, name: 'symbol', description: 'Crypto symbol (e.g., BTC)', required: true}],
execute: async (ctx, args) => {
await skills.crypto.execute(ctx, args);
}
},
help: {
name: 'help',
description: 'Show help menu',
execute: async (ctx) => {
const embed = new EmbedBuilder()
.setTitle('🤖 AI Bot Commands')
.setColor('#5865F2')
.setDescription('Powerful AI assistant with multiple models and skills')
.addFields(
{ name: '💬 AI Chat', value: '`!ai <message>` - Chat with AI\n`!model list` - List models\n`!model set <model>` - Change model\n`!reset` - Clear context' },
{ name: '🎨 Media', value: '`!img <prompt>` - Generate image\n`!analyze` - Analyze image\n`!tts <text>` - Text to speech' },
{ name: '🔧 Tools', value: '`!search <query>` - Web search\n`!calc <expr>` - Calculator\n`!weather <city>` - Weather\n`!translate <lang> <text>` - Translate\n`!crypto <symbol>` - Crypto prices' },
{ name: '⚙️ Settings', value: '`!system <prompt>` - Set system prompt\n`!help` - Show this menu' }
)
.setFooter({ text: `Prefix: ${settings.prefix} | Use slash commands (/) for autocomplete` });
await ctx.reply({ embeds: [embed] });
}
},
stats: {
name: 'stats',
description: 'Bot statistics',
ownerOnly: true,
execute: async (ctx) => {
const userId = ctx.author?.id || ctx.user?.id;
if (!isOwner(userId)) {
await ctx.reply('❌ Owner only command');
return;
}
const stats = await aiManager.getUsageStats();
const health = await aiManager.checkHealth();
const uptime = process.uptime();
const embed = new EmbedBuilder()
.setTitle('📊 Bot Statistics')
.setColor('#FFD700')
.addFields(
{ name: 'Uptime', value: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`, inline: true },
{ name: 'Servers', value: `${ctx.client.guilds.cache.size}`, inline: true },
{ name: 'Memory', value: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`, inline: true },
{ name: 'Total Requests', value: `${stats.totalRequests || 0}`, inline: true },
{ name: 'Today', value: `${stats.todayRequests || 0}`, inline: true }
);
let healthStatus = '';
for (const [provider, status] of Object.entries(health)) {
const emoji = status.status === 'healthy' ? '🟢' : '🔴';
healthStatus += `${emoji} ${provider}\n`;
}
embed.addFields({ name: 'Provider Health', value: healthStatus || 'No data' });
await ctx.reply({ embeds: [embed] });
}
}
};
module.exports = {
async handleTextCommand(message) {
const args = message.content.slice(settings.prefix.length).trim().split(/ +/);
const commandName = args.shift().toLowerCase();
const command = commandDefinitions[commandName];
if (!command) return;
try {
await command.execute(message, args);
} catch (error) {
logger.error(`Command error (${commandName}): ${error.message}`);
await message.reply(`❌ Error: ${error.message}`);
}
},
async handleSlashCommand(interaction) {
const command = commandDefinitions[interaction.commandName];
if (!command) return;
try {
await command.execute(interaction, []);
} catch (error) {
logger.error(`Slash command error (${interaction.commandName}): ${error.message}`);
const reply = { content: `❌ Error: ${error.message}`, ephemeral: true };
await (interaction.replied || interaction.deferred ? interaction.followUp(reply) : interaction.reply(reply));
}
},
async handleAutocomplete(interaction) {
if (interaction.commandName === 'model' && interaction.options.getSubcommand() === 'set') {
const focusedValue = interaction.options.getFocused().toLowerCase();
const models = aiManager.getModels();
const choices = [];
for (const provider of Object.values(models)) {
for (const model of provider.models.slice(0, 5)) {
if (model.id.toLowerCase().includes(focusedValue) || model.name.toLowerCase().includes(focusedValue)) {
choices.push({ name: `${model.name} (${provider.name})`, value: model.id });
if (choices.length >= 25) break;
}
}
if (choices.length >= 25) break;
}
await interaction.respond(choices);
}
},
async registerSlashCommands(client) {
const commands = Object.entries(commandDefinitions)
.filter(([_, cmd]) => !cmd.ownerOnly)
.map(([name, cmd]) => {
const builder = new SlashCommandBuilder()
.setName(cmd.name)
.setDescription(cmd.description);
if (cmd.options) {
for (const opt of cmd.options) {
if (opt.type === 1) {
builder.addSubcommand(sub => {
sub.setName(opt.name).setDescription(opt.description);
if (opt.options) {
for (const subOpt of opt.options) {
if (subOpt.type === 3) sub.addStringOption(o => o.setName(subOpt.name).setDescription(subOpt.description).setRequired(!!subOpt.required));
}
}
return sub;
});
} else if (opt.type === 3) {
builder.addStringOption(o => o.setName(opt.name).setDescription(opt.description).setRequired(!!opt.required).setAutocomplete(opt.autocomplete || false));
} else if (opt.type === 11) {
builder.addAttachmentOption(o => o.setName(opt.name).setDescription(opt.description).setRequired(!!opt.required));
}
}
}
return builder.toJSON();
});
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
try {
logger.info('Registering slash commands...');
await rest.put(
Routes.applicationCommands(client.user.id),
{ body: commands }
);
logger.info(`✅ Registered ${commands.length} slash commands`);
} catch (error) {
logger.error('Failed to register slash commands:', error);
}
},
loadCommands(client) {
logger.info(`Loaded ${Object.keys(commandDefinitions).length} commands`);
}
};
