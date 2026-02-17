// ==================== CODE EXECUTION SKILL ====================
const axios = require('axios');
const { createEmbed, createErrorEmbed, truncate, codeBlock } = require('../utils/helpers');
const { isOwner } = require('../utils/permissions');
const logger = require('../services/logger');
const settings = require('../config/settings');
const LANGUAGES = {
'js': { name: 'JavaScript', pistonLang: 'javascript', version: '18.15.0' },
'javascript': { name: 'JavaScript', pistonLang: 'javascript', version: '18.15.0' },
'py': { name: 'Python', pistonLang: 'python', version: '3.10.0' },
'python': { name: 'Python', pistonLang: 'python', version: '3.10.0' },
'ts': { name: 'TypeScript', pistonLang: 'typescript', version: '5.0.3' },
'typescript': { name: 'TypeScript', pistonLang: 'typescript', version: '5.0.3' },
'go': { name: 'Go', pistonLang: 'go', version: '1.16.2' },
'rust': { name: 'Rust', pistonLang: 'rust', version: '1.68.2' },
'java': { name: 'Java', pistonLang: 'java', version: '15.0.2' },
'c': { name: 'C', pistonLang: 'c', version: '10.2.0' },
'cpp': { name: 'C++', pistonLang: 'c++', version: '10.2.0' },
'c++': { name: 'C++', pistonLang: 'c++', version: '10.2.0' },
'ruby': { name: 'Ruby', pistonLang: 'ruby', version: '3.0.1' },
'php': { name: 'PHP', pistonLang: 'php', version: '8.2.3' },
'bash': { name: 'Bash', pistonLang: 'bash', version: '5.2.0' },
'sh': { name: 'Bash', pistonLang: 'bash', version: '5.2.0' }
};
class CodeRunner {
async execute(language, code) {
return this.pistonExecute(language, code);
}
async pistonExecute(language, code) {
const langConfig = LANGUAGES[language.toLowerCase()];
if (!langConfig) throw new Error(`Unsupported language: ${language}`);
const response = await axios.post('https://emkc.org/api/v2/piston/execute', {
language: langConfig.pistonLang,
version: langConfig.version,
files: [{ content: code }],
stdin: '',
args: [],
compile_timeout: 10000,
run_timeout: 5000,
compile_memory_limit: -1,
run_memory_limit: -1
}, { timeout: 30000 });
const result = response.data;
return {
language: langConfig.name,
output: result.run?.output || result.compile?.output || 'No output',
stderr: result.run?.stderr || result.compile?.stderr || '',
code: result.run?.code || result.compile?.code || 0,
signal: result.run?.signal
};
}
}
const codeRunner = new CodeRunner();
module.exports = {
name: 'code',
description: 'Execute code in various languages',
usage: '!run <language> <code>',
cooldown: 10,
async execute(ctx, args) {
const userId = ctx.author?.id || ctx.user?.id;
if (!settings.features.codeExecution && !isOwner(userId)) {
await ctx.reply({ embeds: [createErrorEmbed('Code execution is disabled.')] });
return;
}
let language = ctx.options?.getString('language') || args[0];
let code = ctx.options?.getString('code') || args.slice(1).join(' ');
if (!language || !code) {
const langList = Object.entries(LANGUAGES).filter(([k, v], i, arr) => arr.findIndex(([k2, v2]) => v2.name === v.name) === i).map(([k, v]) => `\`${k}\``).join(', ');
await ctx.reply({ embeds: [createEmbed({
title: '💻 Code Runner Help',
description: 'Execute code in various programming languages',
color: settings.colors.info,
fields: [
{ name: 'Usage', value: '`!run <language> <code>`\n`!run <language> \\`\\`\\`code\\`\\`\\``' },
{ name: 'Languages', value: langList },
{ name: 'Examples', value: '`!run py print("Hello")`\n`!run js console.log(1+1)`' }
]
})] });
return;
}
const codeBlockMatch = code.match(/```(?:\w+)?\n?([\s\S]+?)```/);
if (codeBlockMatch) {
code = codeBlockMatch[1];
}
code = code.replace(/^`|`$/g, '').trim();
if (code.length > 10000) {
await ctx.reply({ embeds: [createErrorEmbed('Code too long! Maximum 10000 characters.')] });
return;
}
const langConfig = LANGUAGES[language.toLowerCase()];
if (!langConfig) {
await ctx.reply({ embeds: [createErrorEmbed(`Unsupported language: ${language}`)] });
return;
}
await ctx.deferReply?.() || ctx.channel?.sendTyping();
try {
const result = await codeRunner.execute(language, code);
const output = truncate(result.output || 'No output', 1500);
const stderr = result.stderr ? truncate(result.stderr, 500) : '';
const embed = createEmbed({
title: `💻 ${result.language} Execution`,
color: result.code === 0 ? settings.colors.success : settings.colors.error,
fields: [
{ name: '📥 Input', value: codeBlock(truncate(code, 500), language) },
{ name: '📤 Output', value: codeBlock(output, '') }
],
footer: `Exit code: ${result.code}${result.signal ? ` | Signal: ${result.signal}` : ''}`
});
if (stderr) {
embed.addFields({ name: '⚠️ Stderr', value: codeBlock(stderr, '') });
}
await (ctx.editReply ? ctx.editReply({ embeds: [embed] }) : ctx.reply({ embeds: [embed] }));
} catch (error) {
logger.error(`Code execution error: ${error.message}`);
await (ctx.editReply ? ctx.editReply({ embeds: [createErrorEmbed(`Execution failed: ${error.message}`)] }) : ctx.reply({ embeds: [createErrorEmbed(`Execution failed: ${error.message}`)] }));
}
},
getLanguages() {
return LANGUAGES;
}
};
