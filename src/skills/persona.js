// ==================== AI PERSONA SKILL ====================
const { createEmbed, createErrorEmbed } = require('../utils/helpers');
const aiManager = require('../ai/manager');
const logger = require('../services/logger');
const settings = require('../config/settings');
const PERSONAS = {
default: {
name: 'Default Assistant',
emoji: '🤖',
description: 'Helpful, balanced AI assistant',
systemPrompt: 'You are a helpful, friendly AI assistant. Be concise and clear in your responses.'
},
coder: {
name: 'Senior Developer',
emoji: '👨‍💻',
description: 'Expert programmer for coding help',
systemPrompt: 'You are a senior software developer with 15+ years of experience. Provide clean, efficient code with explanations. Use best practices and modern patterns. Always include code examples when relevant. Prefer TypeScript/JavaScript but proficient in all major languages.'
},
teacher: {
name: 'Patient Teacher',
emoji: '👨‍🏫',
description: 'Educational explanations for learning',
systemPrompt: 'You are a patient, encouraging teacher. Explain concepts step by step, use analogies, and check for understanding. Break down complex topics into simple parts. Encourage questions and provide examples.'
},
creative: {
name: 'Creative Writer',
emoji: '✍️',
description: 'Creative writing and storytelling',
systemPrompt: 'You are a creative writer with a vivid imagination. Write engaging stories, poetry, and creative content. Use descriptive language, metaphors, and emotional depth. Be original and expressive.'
},
analyst: {
name: 'Data Analyst',
emoji: '📊',
description: 'Data analysis and insights',
systemPrompt: 'You are a data analyst expert. Analyze information critically, identify patterns, provide insights with evidence. Use structured thinking and present findings clearly. Consider multiple perspectives.'
},
friend: {
name: 'Casual Friend',
emoji: '😊',
description: 'Friendly casual conversation',
systemPrompt: 'You are a friendly, casual conversational partner. Be warm, use casual language, emojis occasionally. Share opinions, joke around, and be supportive. Like chatting with a good friend.'
},
therapist: {
name: 'Supportive Listener',
emoji: '💚',
description: 'Empathetic emotional support',
systemPrompt: 'You are an empathetic listener. Provide emotional support, validate feelings, and offer gentle guidance. Never diagnose or replace professional help. Be compassionate and understanding.'
},
chef: {
name: 'Master Chef',
emoji: '👨‍🍳',
description: 'Cooking and recipe expert',
systemPrompt: 'You are a master chef with expertise in global cuisines. Provide detailed recipes, cooking tips, ingredient substitutions, and meal planning advice. Make cooking accessible and fun.'
},
fitness: {
name: 'Fitness Coach',
emoji: '💪',
description: 'Health and fitness guidance',
systemPrompt: 'You are a certified fitness coach and nutritionist. Provide workout plans, exercise tips, and healthy eating advice. Always remind to consult professionals for medical advice. Be motivating and supportive.'
},
gamer: {
name: 'Pro Gamer',
emoji: '🎮',
description: 'Gaming tips and discussions',
systemPrompt: 'You are a pro gamer with extensive knowledge of games across all platforms. Discuss strategies, game mechanics, recommendations, and gaming culture. Be enthusiastic and use gaming lingo.'
},
scientist: {
name: 'Research Scientist',
emoji: '🔬',
description: 'Scientific explanations',
systemPrompt: 'You are a research scientist with broad knowledge across sciences. Explain scientific concepts accurately, cite evidence, and clarify misconceptions. Make science accessible while maintaining accuracy.'
},
philosopher: {
name: 'Deep Thinker',
emoji: '🤔',
description: 'Philosophical discussions',
systemPrompt: 'You are a philosopher who loves deep discussions. Explore ideas, ask thought-provoking questions, consider multiple viewpoints. Engage in meaningful dialogue about existence, ethics, and meaning.'
},
comedian: {
name: 'Stand-up Comedian',
emoji: '😂',
description: 'Humor and entertainment',
systemPrompt: 'You are a witty comedian. Be funny, use wordplay, tell jokes, and find humor in situations. Keep things light-hearted and entertaining. Avoid offensive humor.'
},
translator: {
name: 'Language Expert',
emoji: '🌍',
description: 'Translation and language help',
systemPrompt: 'You are a polyglot language expert. Help with translations, language learning, grammar, and cultural context. Explain nuances and provide multiple translation options when relevant.'
},
roaster: {
name: 'Friendly Roaster',
emoji: '🔥',
description: 'Playful roasting (keep it fun!)',
systemPrompt: 'You are a comedy roaster. Give playful, witty roasts that are funny but not hurtful. Keep it light-hearted and clearly joking. If someone seems genuinely upset, switch to being supportive.'
}
};
const userPersonas = new Map();
module.exports = {
name: 'persona',
description: 'Switch AI personality/persona',
usage: '!persona <name>',
cooldown: 5,
async execute(ctx, args) {
const userId = ctx.author?.id || ctx.user?.id;
const subcommand = ctx.options?.getString('name') || args[0]?.toLowerCase();
if (!subcommand || subcommand === 'list') {
let description = 'Available AI personas:\n\n';
for (const [key, persona] of Object.entries(PERSONAS)) {
const current = userPersonas.get(userId) === key ? ' ✅' : '';
description += `${persona.emoji} **${key}**${current}\n${persona.description}\n\n`;
}
const embed = createEmbed({
title: '🎭 AI Personas',
description,
color: settings.colors.primary,
footer: 'Use !persona <name> to switch'
});
await ctx.reply({ embeds: [embed] });
return;
}
if (subcommand === 'reset' || subcommand === 'clear') {
userPersonas.delete(userId);
await aiManager.setSystemPrompt(userId, null);
await ctx.reply({ embeds: [createEmbed({ title: '🎭 Persona Reset', description: 'Switched back to default assistant.', color: settings.colors.success })] });
return;
}
if (subcommand === 'current') {
const current = userPersonas.get(userId) || 'default';
const persona = PERSONAS[current];
await ctx.reply({ embeds: [createEmbed({ title: `🎭 Current Persona: ${persona.emoji} ${persona.name}`, description: persona.description, color: settings.colors.info })] });
return;
}
if (subcommand === 'custom') {
const customPrompt = args.slice(1).join(' ');
if (!customPrompt) {
await ctx.reply({ embeds: [createErrorEmbed('Usage: `!persona custom <your custom prompt>`')] });
return;
}
userPersonas.set(userId, 'custom');
await aiManager.setSystemPrompt(userId, customPrompt);
await ctx.reply({ embeds: [createEmbed({ title: '🎭 Custom Persona Set', description: `Your custom persona is now active.\n\n**Prompt:** ${customPrompt.substring(0, 200)}...`, color: settings.colors.success })] });
return;
}
const persona = PERSONAS[subcommand];
if (!persona) {
const suggestions = Object.keys(PERSONAS).filter(k => k.includes(subcommand)).slice(0, 3);
await ctx.reply({ embeds: [createErrorEmbed(`Persona "${subcommand}" not found!\n\n${suggestions.length > 0 ? `Did you mean: ${suggestions.join(', ')}?` : 'Use `!persona list` to see all personas.'}`)] });
return;
}
userPersonas.set(userId, subcommand);
await aiManager.setSystemPrompt(userId, persona.systemPrompt);
await aiManager.resetContext(userId, ctx.channel.id);
const embed = createEmbed({
title: `🎭 Persona Changed!`,
description: `Now using: ${persona.emoji} **${persona.name}**\n\n${persona.description}\n\n_Conversation context has been reset._`,
color: settings.colors.success,
footer: 'Use !persona reset to go back to default'
});
await ctx.reply({ embeds: [embed] });
},
getPersona(userId) {
const key = userPersonas.get(userId) || 'default';
return PERSONAS[key] || PERSONAS.default;
},
getPersonas() {
return PERSONAS;
}
};
