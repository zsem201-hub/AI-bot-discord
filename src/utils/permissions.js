// ==================== PERMISSIONS ====================
const settings = require('../config/settings');
const db = require('../services/database');
const PERMISSION_LEVELS = {
PUBLIC: 0,
USER: 1,
PREMIUM: 2,
MODERATOR: 3,
ADMIN: 4,
OWNER: 5
};
function isOwner(userId) {
const ownerIds = settings.ownerIds || [settings.ownerId];
return ownerIds.includes(userId);
}
function isBlacklisted(userId) {
return db.isBlacklisted(userId);
}
async function getPermissionLevel(member, guildId = null) {
if (!member) return PERMISSION_LEVELS.PUBLIC;
const userId = member.id || member.user?.id;
if (isOwner(userId)) return PERMISSION_LEVELS.OWNER;
if (isBlacklisted(userId)) return -1;
if (!member.permissions) return PERMISSION_LEVELS.USER;
if (member.permissions.has('Administrator')) return PERMISSION_LEVELS.ADMIN;
if (member.permissions.has('ManageGuild') || member.permissions.has('ManageMessages')) return PERMISSION_LEVELS.MODERATOR;
return PERMISSION_LEVELS.USER;
}
function hasPermission(member, requiredLevel) {
const level = getPermissionLevel(member);
return level >= requiredLevel;
}
function checkCommandPermission(member, command) {
const requiredLevel = command.permissionLevel || PERMISSION_LEVELS.PUBLIC;
return hasPermission(member, requiredLevel);
}
function requireOwner(userId) {
if (!isOwner(userId)) {
throw new Error('This command requires owner permission');
}
return true;
}
function requireAdmin(member) {
const level = getPermissionLevel(member);
if (level < PERMISSION_LEVELS.ADMIN) {
throw new Error('This command requires administrator permission');
}
return true;
}
function requireModerator(member) {
const level = getPermissionLevel(member);
if (level < PERMISSION_LEVELS.MODERATOR) {
throw new Error('This command requires moderator permission');
}
return true;
}
module.exports = {
PERMISSION_LEVELS,
isOwner,
isBlacklisted,
getPermissionLevel,
hasPermission,
checkCommandPermission,
requireOwner,
requireAdmin,
requireModerator
};
