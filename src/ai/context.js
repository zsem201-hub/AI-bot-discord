// Simple in-memory context (bisa upgrade ke Redis/DB)
const conversations = new Map();
const MAX_HISTORY = 20;

module.exports = {
  get(userId, channelId) {
    const key = `${userId}:${channelId}`;
    return conversations.get(key) || [];
  },
  
  add(userId, channelId, message) {
    const key = `${userId}:${channelId}`;
    const context = this.get(userId, channelId);
    context.push(message);
    
    // Keep only last N messages
    if (context.length > MAX_HISTORY) {
      context.shift();
    }
    
    conversations.set(key, context);
  },
  
  clear(userId, channelId) {
    const key = `${userId}:${channelId}`;
    conversations.delete(key);
  }
};
