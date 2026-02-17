// ==================== TRANSLATE SKILL ====================
const axios = require('axios');
const { createEmbed, createErrorEmbed, truncate } = require('../utils/helpers');
const logger = require('../services/logger');
const settings = require('../config/settings');
const LANGUAGES = {
'en': 'English', 'id': 'Indonesian', 'ja': 'Japanese', 'ko': 'Korean',
'zh': 'Chinese', 'es': 'Spanish', 'fr': 'French', 'de': 'German',
'it': 'Italian', 'pt': 'Portuguese', 'ru': 'Russian', 'ar': 'Arabic',
'hi': 'Hindi', 'th': 'Thai', 'vi': 'Vietnamese', 'nl': 'Dutch',
'tr': 'Turkish', 'pl': 'Polish', 'sv': 'Swedish', 'da': 'Danish',
'fi': 'Finnish', 'no': 'Norwegian', 'cs': 'Czech', 'el': 'Greek',
'he': 'Hebrew', 'uk': 'Ukrainian', 'ms': 'Malay', 'tl': 'Filipino'
};
class TranslateService {
async translate(text, targetLang, sourceLang = 'auto') {
try {
return await this.googleTranslateFree(text, targetLang, sourceLang);
} catch (error) {
logger.warn(`Google translate failed: ${error.message}`);
return await this.libreTranslate(text, targetLang, sourceLang);
}
}
async googleTranslateFree(text, targetLang, sourceLang = 'auto') {
const url = 'https://translate.googleapis.com/translate_a/single';
const response = await axios.get(url, {
params: { client: 'gtx', sl: sourceLang, tl: targetLang, dt: 't', q: text },
timeout: 10000
});
const translations = response.data[0];
const translatedText = translations.map(t => t[0]).join('');
const detectedLang = response.data[2] || sourceLang;
return { translatedText, detectedLanguage: detectedLang, targetLanguage: targetLang };
}
async libreTranslate(text, targetLang, sourceLang = 'auto') {
const response = await axios.post('https://libretranslate.com/translate', {
q: text, source: sourceLang === 'auto' ? 'auto' : sourceLang, target: targetLang, format: 'text'
}, { timeout: 10000 });
return {
translatedText: response.data.translatedText,
detectedLanguage: response.data.detectedLanguage?.language || sourceLang,
targetLanguage: targetLang
};
}
detectLanguageCode(input) {
const lower = input.toLowerCase();
if (LANGUAGES[lower]) return lower;
for (const [code, name] of Object.entries(LANGUAGES)) {
if (name.toLowerCase() === lower) return code;
if (name.toLowerCase().startsWith(lower)) return code;
}
return null;
}
}
const translateService = new TranslateService();
module.exports = {
name: 'translate',
description: 'Translate text between languages',
usage: '!translate <language> <text>',
cooldown: 3,
async execute(ctx, args) {
const targetLangInput = ctx.options?.getString('to') || args[0];
const text = ctx.options?.getString('text') || args.slice(1).join(' ');
if (!targetLangInput || !text) {
const langList = Object.entries(LANGUAGES).slice(0, 15).map(([code, name]) => `\`${code}\` - ${name}`).join('\n');
await ctx.reply({ embeds: [createEmbed({
title: '🌐 Translate Help',
description: 'Translate text between languages',
color: settings.colors.info,
fields: [
{ name: 'Usage', value: '`!translate <language> <text>`' },
{ name: 'Examples', value: '`!translate id Hello world`\n`!translate ja Good morning`\n`!translate en Halo dunia`' },
{ name: 'Languages', value: langList + '\n... and more!' }
]
})] });
return;
}
const targetLang = translateService.detectLanguageCode(targetLangInput);
if (!targetLang) {
await ctx.reply({ embeds: [createErrorEmbed(`Unknown language: "${targetLangInput}"\n\nUse language code (e.g., \`en\`, \`id\`, \`ja\`) or full name.`)] });
return;
}
if (text.length > 2000) {
await ctx.reply({ embeds: [createErrorEmbed('Text too long! Maximum 2000 characters.')] });
return;
}
await ctx.deferReply?.() || ctx.channel?.sendTyping();
try {
const result = await translateService.translate(text, targetLang);
const sourceLangName = LANGUAGES[result.detectedLanguage] || result.detectedLanguage;
const targetLangName = LANGUAGES[result.targetLanguage] || result.targetLanguage;
const embed = createEmbed({
title: '🌐 Translation',
color: settings.colors.primary,
fields: [
{ name: `Original (${sourceLangName})`, value: truncate(text, 1000) },
{ name: `Translation (${targetLangName})`, value: truncate(result.translatedText, 1000) }
],
footer: `${sourceLangName} → ${targetLangName}`
});
await (ctx.editReply ? ctx.editReply({ embeds: [embed] }) : ctx.reply({ embeds: [embed] }));
} catch (error) {
logger.error(`Translate error: ${error.message}`);
await (ctx.editReply ? ctx.editReply({ embeds: [createErrorEmbed(`Translation failed: ${error.message}`)] }) : ctx.reply({ embeds: [createErrorEmbed(`Translation failed: ${error.message}`)] }));
}
},
getLanguages() {
return LANGUAGES;
}
};
