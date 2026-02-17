// ==================== COMMAND DEFINITIONS ====================
const { PERMISSION_LEVELS } = require('../utils/permissions');
module.exports = {
ai: {
name: 'ai',
aliases: ['ask', 'chat', 'gpt'],
description: 'Chat with AI',
usage: '!ai <message>',
examples: ['!ai Hello!', '!ai Explain quantum physics'],
category: 'AI',
permission: PERMISSION_LEVELS.PUBLIC,
cooldown: 3
},
model: {
name: 'model',
aliases: ['m'],
description: 'Manage AI models',
usage: '!model <list|set|current|info> [model]',
examples: ['!model list', '!model set gemini-3-pro', '!model current'],
category: 'AI',
permission: PERMISSION_LEVELS.PUBLIC,
cooldown: 2
},
reset: {
name: 'reset',
aliases: ['clear', 'new'],
description: 'Reset conversation context',
usage: '!reset',
category: 'AI',
permission: PERMISSION_LEVELS.PUBLIC,
cooldown: 5
},
system: {
name: 'system',
aliases: ['sys', 'persona'],
description: 'Set system prompt',
usage: '!system <prompt>',
examples: ['!system You are a helpful coding assistant'],
category: 'AI',
permission: PERMISSION_LEVELS.PUBLIC,
cooldown: 5
},
tts: {
name: 'tts',
aliases: ['speak', 'voice'],
description: 'Text to speech',
usage: '!tts <text>',
examples: ['!tts Hello world!'],
category: 'Media',
permission: PERMISSION_LEVELS.PUBLIC,
cooldown: 5
},
img: {
name: 'img',
aliases: ['image', 'generate', 'draw'],
description: 'Generate image',
usage: '!img <prompt> [--style <style>]',
examples: ['!img a sunset over mountains', '!img cute cat --style anime'],
category: 'Media',
permission: PERMISSION_LEVELS.PUBLIC,
cooldown: 10
},
analyze: {
name: 'analyze',
aliases: ['vision', 'describe'],
description: 'Analyze image',
usage: '!analyze [prompt] (attach image)',
examples: ['!analyze What is in this image?'],
category: 'Media',
permission: PERMISSION_LEVELS.PUBLIC,
cooldown: 5
},
search: {
name: 'search',
aliases: ['google', 'find'],
description: 'Web search',
usage: '!search <query>',
examples: ['!search latest AI news'],
category: 'Tools',
permission: PERMISSION_LEVELS.PUBLIC,
cooldown: 5
},
calc: {
name: 'calc',
aliases: ['calculate', 'math'],
description: 'Calculator',
usage: '!calc <expression>',
examples: ['!calc 2 + 2', '!calc sqrt(144)', '!calc 10% of 500'],
category: 'Tools',
permission: PERMISSION_LEVELS.PUBLIC,
cooldown: 2
},
weather: {
name: 'weather',
aliases: ['cuaca'],
description: 'Get weather info',
usage: '!weather <city>',
examples: ['!weather Jakarta', '!weather New York'],
category: 'Tools',
permission: PERMISSION_LEVELS.PUBLIC,
cooldown: 5
},
translate: {
name: 'translate',
aliases: ['tr', 'terjemah'],
description: 'Translate text',
usage: '!translate <language> <text>',
examples: ['!translate id Hello world', '!translate en Halo dunia'],
category: 'Tools',
permission: PERMISSION_LEVELS.PUBLIC,
cooldown: 3
},
crypto: {
name: 'crypto',
aliases: ['coin', 'price'],
description: 'Get crypto prices',
usage: '!crypto <symbol>',
examples: ['!crypto BTC', '!crypto ETH'],
category: 'Tools',
permission: PERMISSION_LEVELS.PUBLIC,
cooldown: 5
},
remind: {
name: 'remind',
aliases: ['reminder', 'remindme'],
description: 'Set reminder',
usage: '!remind <time> <message>',
examples: ['!remind 1h Check email', '!remind 30m Meeting'],
category: 'Tools',
permission: PERMISSION_LEVELS.PUBLIC,
cooldown: 5
},
help: {
name: 'help',
aliases: ['h', 'commands', 'menu'],
description: 'Show help menu',
usage: '!help [command]',
examples: ['!help', '!help ai'],
category: 'Utility',
permission: PERMISSION_LEVELS.PUBLIC,
cooldown: 2
},
stats: {
name: 'stats',
aliases: ['status', 'info'],
description: 'Bot statistics',
usage: '!stats',
category: 'Utility',
permission: PERMISSION_LEVELS.OWNER,
cooldown: 5
},
broadcast: {
name: 'broadcast',
aliases: ['bc'],
description: 'Broadcast message',
usage: '!broadcast <message>',
category: 'Admin',
permission: PERMISSION_LEVELS.OWNER,
cooldown: 60
},
blacklist: {
name: 'blacklist',
aliases: ['bl'],
description: 'Manage blacklist',
usage: '!blacklist <add|remove|list> [user]',
category: 'Admin',
permission: PERMISSION_LEVELS.OWNER,
cooldown: 5
}
};
