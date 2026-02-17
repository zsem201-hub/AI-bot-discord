// ==================== TTS SKILL ====================
const axios = require('axios');
const { AttachmentBuilder } = require('discord.js');
const { isOwner } = require('../utils/permissions');
const { createEmbed, createErrorEmbed } = require('../utils/helpers');
const logger = require('../services/logger');
const settings = require('../config/settings');
class ElevenLabsService {
constructor() {
this.baseUrl = 'https://api.elevenlabs.io/v1';
this.apiKey = process.env.ELEVENLABS_API_KEY;
}
async synthesize(text, voiceId = null) {
if (!this.apiKey) throw new Error('ElevenLabs API key not configured');
voiceId = voiceId || settings.tts.ownerVoice || 'adam';
const response = await axios.post(
`${this.baseUrl}/text-to-speech/${voiceId}`,
{
text,
model_id: 'eleven_multilingual_v2',
voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.5, use_speaker_boost: true }
},
{
headers: { 'Accept': 'audio/mpeg', 'Content-Type': 'application/json', 'xi-api-key': this.apiKey },
responseType: 'arraybuffer',
timeout: 30000
}
);
return Buffer.from(response.data);
}
async getVoices() {
if (!this.apiKey) return [];
const response = await axios.get(`${this.baseUrl}/voices`, {
headers: { 'xi-api-key': this.apiKey }
});
return response.data.voices;
}
}
class GoogleTTSService {
constructor() {
this.baseUrl = 'https://texttospeech.googleapis.com/v1';
this.apiKey = process.env.GOOGLE_TTS_API_KEY;
}
async synthesize(text, voice = 'en-US-Standard-B', languageCode = 'en-US') {
if (!this.apiKey) {
return this.synthesizeFree(text, languageCode);
}
const response = await axios.post(
`${this.baseUrl}/text:synthesize?key=${this.apiKey}`,
{
input: { text },
voice: { languageCode, name: voice },
audioConfig: { audioEncoding: 'MP3', speakingRate: 1.0, pitch: 0 }
},
{ timeout: 15000 }
);
return Buffer.from(response.data.audioContent, 'base64');
}
async synthesizeFree(text, lang = 'en') {
const encodedText = encodeURIComponent(text.substring(0, 200));
const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodedText}&tl=${lang}&client=tw-ob`;
const response = await axios.get(url, {
responseType: 'arraybuffer',
headers: { 'User-Agent': 'Mozilla/5.0' },
timeout: 10000
});
return Buffer.from(response.data);
}
}
const elevenLabs = new ElevenLabsService();
const googleTTS = new GoogleTTSService();
module.exports = {
name: 'tts',
description: 'Text to Speech - Convert text to voice',
usage: '!tts <text>',
cooldown: 5,
async execute(ctx, args) {
const text = ctx.options?.getString('text') || args.join(' ');
if (!text) {
await ctx.reply({ embeds: [createErrorEmbed('Please provide text to convert!\nUsage: `!tts <text>`')] });
return;
}
if (text.length > settings.tts.maxLength) {
await ctx.reply({ embeds: [createErrorEmbed(`Text too long! Maximum ${settings.tts.maxLength} characters.`)] });
return;
}
await ctx.deferReply?.() || ctx.channel?.sendTyping();
const userId = ctx.author?.id || ctx.user?.id;
const isOwnerUser = isOwner(userId);
try {
let audioBuffer;
let provider;
if (isOwnerUser && process.env.ELEVENLABS_API_KEY) {
audioBuffer = await elevenLabs.synthesize(text);
provider = 'ElevenLabs';
} else {
const lang = text.match(/[\u3040-\u309f\u30a0-\u30ff]/) ? 'ja' :
text.match(/[\u4e00-\u9fff]/) ? 'zh' :
text.match(/[\uac00-\ud7af]/) ? 'ko' :
text.match(/[ก-๙]/) ? 'th' :
text.match(/[а-яА-Я]/) ? 'ru' :
text.match(/[أ-ي]/) ? 'ar' :
text.match(/[ا-ی]/) ? 'fa' : 'en';
audioBuffer = await googleTTS.synthesize(text, undefined, lang);
provider = 'Google TTS';
}
const attachment = new AttachmentBuilder(audioBuffer, { name: 'tts.mp3' });
const embed = createEmbed({
title: '🔊 Text to Speech',
description: `"${text.substring(0, 100)}${text.length > 100 ? '...' : ''}"`,
footer: `Provider: ${provider} | Requested by ${ctx.author?.username || ctx.user?.username}`,
color: settings.colors.primary
});
await (ctx.editReply ? ctx.editReply({ embeds: [embed], files: [attachment] }) : ctx.reply({ embeds: [embed], files: [attachment] }));
} catch (error) {
logger.error(`TTS error: ${error.message}`);
await (ctx.editReply ? ctx.editReply({ embeds: [createErrorEmbed(`TTS failed: ${error.message}`)] }) : ctx.reply({ embeds: [createErrorEmbed(`TTS failed: ${error.message}`)] }));
}
},
async getVoices(userId) {
if (isOwner(userId) && process.env.ELEVENLABS_API_KEY) {
return await elevenLabs.getVoices();
}
return [
{ id: 'en-US-Standard-A', name: 'English Female' },
{ id: 'en-US-Standard-B', name: 'English Male' },
{ id: 'id-ID-Standard-A', name: 'Indonesian Female' },
{ id: 'id-ID-Standard-B', name: 'Indonesian Male' }
];
}
};
