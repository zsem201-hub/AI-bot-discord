// ==================== CACHE SERVICE ====================
const logger = require('./logger');
class CacheService {
constructor() {
this.cache = new Map();
this.ttls = new Map();
this.maxSize = 1000;
this.defaultTTL = 3600000; // 1 hour in ms
this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
}
set(key, value, ttl = this.defaultTTL) {
if (this.cache.size >= this.maxSize) {
const firstKey = this.cache.keys().next().value;
this.delete(firstKey);
}
this.cache.set(key, value);
this.ttls.set(key, Date.now() + ttl);
return true;
}
get(key) {
if (!this.cache.has(key)) return null;
const expiry = this.ttls.get(key);
if (expiry && Date.now() > expiry) {
this.delete(key);
return null;
}
return this.cache.get(key);
}
has(key) {
if (!this.cache.has(key)) return false;
const expiry = this.ttls.get(key);
if (expiry && Date.now() > expiry) {
this.delete(key);
return false;
}
return true;
}
delete(key) {
this.cache.delete(key);
this.ttls.delete(key);
}
clear() {
this.cache.clear();
this.ttls.clear();
}
cleanup() {
const now = Date.now();
let cleaned = 0;
for (const [key, expiry] of this.ttls.entries()) {
if (now > expiry) {
this.delete(key);
cleaned++;
}
}
if (cleaned > 0) {
logger.debug(`Cache cleanup: removed ${cleaned} expired entries`);
}
}
getStats() {
return {
size: this.cache.size,
maxSize: this.maxSize
};
}
getOrSet(key, factory, ttl = this.defaultTTL) {
const cached = this.get(key);
if (cached !== null) return cached;
const value = typeof factory === 'function' ? factory() : factory;
this.set(key, value, ttl);
return value;
}
async getOrSetAsync(key, factory, ttl = this.defaultTTL) {
const cached = this.get(key);
if (cached !== null) return cached;
const value = await factory();
this.set(key, value, ttl);
return value;
}
mget(keys) {
const results = {};
for (const key of keys) {
results[key] = this.get(key);
}
return results;
}
mset(entries, ttl = this.defaultTTL) {
for (const [key, value] of Object.entries(entries)) {
this.set(key, value, ttl);
}
}
keys(pattern = null) {
if (!pattern) return Array.from(this.cache.keys());
const regex = new RegExp(pattern.replace('*', '.*'));
return Array.from(this.cache.keys()).filter(key => regex.test(key));
}
destroy() {
clearInterval(this.cleanupInterval);
this.clear();
}
}
module.exports = new CacheService();
