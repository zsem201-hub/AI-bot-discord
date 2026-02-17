// ==================== TAG SKILL ====================
const { createEmbed, createErrorEmbed, truncate } = require('../utils/helpers');
const { isOwner, hasPermission, PERMISSION_LEVELS } = require('../utils/permissions');
const db = require('../services/database');
const logger = require('../services/logger');
const settings = require('../config/settings');
module.exports = {
name: 'tag',
description: 'Create and use custom command shortcuts',
usage: '!tag <name> or !tag create <name> <content>',
cooldown: 2,
async execute(ctx, args) {
const subcommand = ctx.options?.getSubcommand?.() || args[0]?.toLowerCase();
const userId = ctx.author?.id || ctx.user?.id;
const guildId = ctx.guild?.id;
if (!guildId) {
await ctx.reply({ embeds: [createErrorEmbed('Tags can only be used in servers!')] });
return;
}
if (subcommand === 'create' || subcommand === 'add') {
const name = args[1]?.toLowerCase();
const content = args.slice(2).join(' ');
if (!name || !content) {
await ctx.reply({ embeds: [createErrorEmbed('Usage: `!tag create <name> <content>`')] });
return;
}
if (name.length > 32) {
await ctx.reply({ embeds: [createErrorEmbed('Tag name must be 32 characters or less!')] });
return;
}
if (content.length > 2000) {
await ctx.reply({ embeds: [createErrorEmbed('Tag content must be 2000 characters or less!')] });
return;
}
const reserved = ['create', 'add', 'delete', 'remove', 'edit', 'list', 'info', 'search', 'raw'];
if (reserved.includes(name)) {
await ctx.reply({ embeds: [createErrorEmbed(`"${name}" is a reserved word!`)] });
return;
}
try {
const existing = await this.getTag(guildId, name);
if (existing) {
await ctx.reply({ embeds: [createErrorEmbed(`Tag "${name}" already exists!`)] });
return;
}
await this.createTag(guildId, name, content, userId);
await ctx.reply({ embeds: [createEmbed({ title: '✅ Tag Created', description: `Tag **${name}** has been created!\n\nUse it with: \`!tag ${name}\``, color: settings.colors.success })] });
} catch (error) {
await ctx.reply({ embeds: [createErrorEmbed(`Failed to create tag: ${error.message}`)] });
}
return;
}
if (subcommand === 'delete' || subcommand === 'remove') {
const name = args[1]?.toLowerCase();
if (!name) {
await ctx.reply({ embeds: [createErrorEmbed('Usage: `!tag delete <name>`')] });
return;
}
try {
const tag = await this.getTag(guildId, name);
if (!tag) {
await ctx.reply({ embeds: [createErrorEmbed(`Tag "${name}" not found!`)] });
return;
}
if (tag.author_id !== userId && !isOwner(userId)) {
await ctx.reply({ embeds: [createErrorEmbed('You can only delete your own tags!')] });
return;
}
await this.deleteTag(guildId, name);
await ctx.reply({ embeds: [createEmbed({ title: '✅ Tag Deleted', description: `Tag **${name}** has been deleted.`, color: settings.colors.success })] });
} catch (error) {
await ctx.reply({ embeds: [createErrorEmbed(`Failed: ${error.message}`)] });
}
return;
}
if (subcommand === 'edit') {
const name = args[1]?.toLowerCase();
const content = args.slice(2).join(' ');
if (!name || !content) {
await ctx.reply({ embeds: [createErrorEmbed('Usage: `!tag edit <name> <new content>`')] });
return;
}
try {
const tag = await this.getTag(guildId, name);
if (!tag) {
await ctx.reply({ embeds: [createErrorEmbed(`Tag "${name}" not found!`)] });
return;
}
if (tag.author_id !== userId && !isOwner(userId)) {
await ctx.reply({ embeds: [createErrorEmbed('You can only edit your own tags!')] });
return;
}
await this.updateTag(guildId, name, content);
await ctx.reply({ embeds: [createEmbed({ title: '✅ Tag Updated', description: `Tag **${name}** has been updated.`, color: settings.colors.success })] });
} catch (error) {
await ctx.reply({ embeds: [createErrorEmbed(`Failed: ${error.message}`)] });
}
return;
}
if (subcommand === 'list') {
try {
const tags = await this.getAllTags(guildId);
if (tags.length === 0) {
await ctx.reply({ embeds: [createEmbed({ title: '🏷️ Server Tags', description: 'No tags created yet.\n\nCreate one with: `!tag create <name> <content>`', color: settings.colors.info })] });
return;
}
const tagList = tags.map(t => `\`${t.name}\``).join(', ');
await ctx.reply({ embeds: [createEmbed({ title: `🏷️ Server Tags (${tags.length})`, description: tagList, color: settings.colors.primary, footer: 'Use !tag <name> to use a tag' })] });
} catch (error) {
await ctx.reply({ embeds: [createErrorEmbed(`Failed: ${error.message}`)] });
}
return;
}
if (subcommand === 'info') {
const name = args[1]?.toLowerCase();
if (!name) {
await ctx.reply({ embeds: [createErrorEmbed('Usage: `!tag info <name>`')] });
return;
}
try {
const tag = await this.getTag(guildId, name);
if (!tag) {
await ctx.reply({ embeds: [createErrorEmbed(`Tag "${name}" not found!`)] });
return;
}
const embed = createEmbed({
title: `🏷️ Tag: ${tag.name}`,
color: settings.colors.primary,
fields: [
{ name: 'Author', value: `<@${tag.author_id}>`, inline: true },
{ name: 'Uses', value: (tag.uses || 0).toString(), inline: true },
{ name: 'Created', value: tag.created_at ? new Date(tag.created_at * 1000).toLocaleDateString() : 'Unknown', inline: true },
{ name: 'Content Preview', value: truncate(tag.content, 200) }
]
});
await ctx.reply({ embeds: [embed] });
} catch (error) {
await ctx.reply({ embeds: [createErrorEmbed(`Failed: ${error.message}`)] });
}
return;
}
if (subcommand === 'raw') {
const name = args[1]?.toLowerCase();
if (!name) {
await ctx.reply({ embeds: [createErrorEmbed('Usage: `!tag raw <name>`')] });
return;
}
try {
const tag = await this.getTag(guildId, name);
if (!tag) {
await ctx.reply({ embeds: [createErrorEmbed(`Tag "${name}" not found!`)] });
return;
}
await ctx.reply(`\`\`\`\n${tag.content}\n\`\`\``);
} catch (error) {
await ctx.reply({ embeds: [createErrorEmbed(`Failed: ${error.message}`)] });
}
return;
}
const tagName = (subcommand || args[0])?.toLowerCase();
if (!tagName) {
const embed = createEmbed({
title: '🏷️ Tag Help',
color: settings.colors.info,
fields: [
{ name: 'Use Tag', value: '`!tag <name>`' },
{ name: 'Create Tag', value: '`!tag create <name> <content>`' },
{ name: 'Delete Tag', value: '`!tag delete <name>`' },
{ name: 'Edit Tag', value: '`!tag edit <name> <new content>`' },
{ name: 'List Tags', value: '`!tag list`' },
{ name: 'Tag Info', value: '`!tag info <name>`' },
{ name: 'Raw Content', value: '`!tag raw <name>`' }
]
});
await ctx.reply({ embeds: [embed] });
return;
}
try {
const tag = await this.getTag(guildId, tagName);
if (!tag) {
await ctx.reply({ embeds: [createErrorEmbed(`Tag "${tagName}" not found!\n\nUse \`!tag list\` to see available tags.`)] });
return;
}
await this.incrementUses(guildId, tagName);
await ctx.reply(tag.content);
} catch (error) {
await ctx.reply({ embeds: [createErrorEmbed(`Failed: ${error.message}`)] });
}
},
async getTag(guildId, name) {
try {
return db.db.prepare('SELECT * FROM tags WHERE guild_id = ? AND name = ?').get(guildId, name);
} catch {
await this.ensureTable();
return db.db.prepare('SELECT * FROM tags WHERE guild_id = ? AND name = ?').get(guildId, name);
}
},
async getAllTags(guildId) {
try {
return db.db.prepare('SELECT * FROM tags WHERE guild_id = ? ORDER BY uses DESC').all(guildId);
} catch {
await this.ensureTable();
return [];
}
},
async createTag(guildId, name, content, authorId) {
await this.ensureTable();
db.db.prepare('INSERT INTO tags (guild_id, name, content, author_id, uses, created_at) VALUES (?, ?, ?, ?, 0, strftime("%s", "now"))').run(guildId, name, content, authorId);
},
async updateTag(guildId, name, content) {
db.db.prepare('UPDATE tags SET content = ? WHERE guild_id = ? AND name = ?').run(content, guildId, name);
},
async deleteTag(guildId, name) {
db.db.prepare('DELETE FROM tags WHERE guild_id = ? AND name = ?').run(guildId, name);
},
async incrementUses(guildId, name) {
db.db.prepare('UPDATE tags SET uses = uses + 1 WHERE guild_id = ? AND name = ?').run(guildId, name);
},
async ensureTable() {
db.db.exec(`CREATE TABLE IF NOT EXISTS tags (id INTEGER PRIMARY KEY AUTOINCREMENT, guild_id TEXT NOT NULL, name TEXT NOT NULL, content TEXT NOT NULL, author_id TEXT NOT NULL, uses INTEGER DEFAULT 0, created_at INTEGER, UNIQUE(guild_id, name))`);
}
};
