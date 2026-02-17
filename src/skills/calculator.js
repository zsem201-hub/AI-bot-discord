// ==================== CALCULATOR SKILL ====================
const { createEmbed, createErrorEmbed } = require('../utils/helpers');
const settings = require('../config/settings');
const MATH_FUNCTIONS = {
sin: Math.sin, cos: Math.cos, tan: Math.tan,
asin: Math.asin, acos: Math.acos, atan: Math.atan,
sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh,
sqrt: Math.sqrt, cbrt: Math.cbrt,
abs: Math.abs, ceil: Math.ceil, floor: Math.floor, round: Math.round,
log: Math.log, log10: Math.log10, log2: Math.log2,
exp: Math.exp, pow: Math.pow,
min: Math.min, max: Math.max,
random: Math.random,
sign: Math.sign, trunc: Math.trunc
};
const CONSTANTS = {
pi: Math.PI, PI: Math.PI,
e: Math.E, E: Math.E,
phi: 1.618033988749895,
tau: Math.PI * 2
};
function safeEval(expression) {
let expr = expression.toLowerCase()
.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-')
.replace(/\^/g, '**').replace(/mod/g, '%')
.replace(/(\d+)%\s*of\s*(\d+)/gi, '($2 * $1 / 100)')
.replace(/(\d+)%/g, '($1/100)')
.replace(/(\d+)!/g, (_, n) => factorial(parseInt(n)));
for (const [name, value] of Object.entries(CONSTANTS)) {
expr = expr.replace(new RegExp(`\\b${name}\\b`, 'gi'), value.toString());
}
for (const funcName of Object.keys(MATH_FUNCTIONS)) {
const regex = new RegExp(`\\b${funcName}\\s*\\(`, 'gi');
expr = expr.replace(regex, `__MATH__.${funcName}(`);
}
const forbidden = /[a-zA-Z_$][a-zA-Z0-9_$]*(?!\s*\()/g;
const cleaned = expr.replace(/__MATH__\.\w+\(/g, '').replace(/\d+\.?\d*/g, '');
if (forbidden.test(cleaned)) {
throw new Error('Invalid expression');
}
const func = new Function('__MATH__', `"use strict"; return (${expr})`);
return func(MATH_FUNCTIONS);
}
function factorial(n) {
if (n < 0) return NaN;
if (n === 0 || n === 1) return 1;
if (n > 170) return Infinity;
let result = 1;
for (let i = 2; i <= n; i++) result *= i;
return result;
}
function formatResult(num) {
if (typeof num !== 'number' || isNaN(num)) return 'Error: Invalid result';
if (!isFinite(num)) return num > 0 ? 'Infinity' : '-Infinity';
if (Number.isInteger(num)) return num.toLocaleString();
const str = num.toPrecision(15);
return parseFloat(str).toString();
}
module.exports = {
name: 'calculator',
description: 'Perform mathematical calculations',
usage: '!calc <expression>',
cooldown: 2,
async execute(ctx, args) {
const expression = ctx.options?.getString('expression') || args.join(' ');
if (!expression) {
const helpEmbed = createEmbed({
title: '🔢 Calculator Help',
description: 'Perform mathematical calculations',
color: settings.colors.info,
fields: [
{ name: 'Basic', value: '`!calc 2 + 2`\n`!calc 10 * 5`\n`!calc 100 / 4`' },
{ name: 'Power', value: '`!calc 2^8`\n`!calc 5**2`' },
{ name: 'Functions', value: '`!calc sqrt(144)`\n`!calc sin(pi/2)`\n`!calc log10(100)`' },
{ name: 'Percentage', value: '`!calc 20% of 500`\n`!calc 150 * 15%`' },
{ name: 'Factorial', value: '`!calc 5!`\n`!calc 10!`' },
{ name: 'Constants', value: '`pi` = π, `e` = Euler\'s number, `phi` = Golden ratio' }
]
});
await ctx.reply({ embeds: [helpEmbed] });
return;
}
try {
const result = safeEval(expression);
const formatted = formatResult(result);
const embed = createEmbed({
title: '🔢 Calculator',
color: settings.colors.success,
fields: [
{ name: 'Expression', value: `\`${expression}\``, inline: false },
{ name: 'Result', value: `**${formatted}**`, inline: false }
]
});
await ctx.reply({ embeds: [embed] });
} catch (error) {
await ctx.reply({ embeds: [createErrorEmbed(`Invalid expression: ${expression}\n\nUse \`!calc\` for help.`)] });
}
}
};
