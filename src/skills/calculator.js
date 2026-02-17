// src/skills/calculator.js
module.exports = {
  name: 'calculator',
  description: 'Perform math calculations',
  usage: '!calc <expression>',
  permission: 'PUBLIC',
  
  async execute(message, args) {
    const expression = args.join(' ');
    
    // Your skill logic here
    const result = eval(expression); // (use safer eval lib)
    
    await message.reply(`Result: ${result}`);
  }
};
