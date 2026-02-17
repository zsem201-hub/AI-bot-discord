// Automatically load all skills
const fs = require('fs');
const path = require('path');

const skills = {};

// Load all .js files in skills folder
const files = fs.readdirSync(__dirname)
  .filter(f => f.endsWith('.js') && f !== 'index.js');

for (const file of files) {
  const skill = require(path.join(__dirname, file));
  skills[skill.name] = skill;
}

module.exports = skills;

// Usage: skills.calculator.execute(message, args)
