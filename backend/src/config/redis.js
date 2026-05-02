const logger = require('./logger');

let redisClient = null;
const memoryCache = new Map();

async function initializeRedis() {
  if (!process.env.REDIS_URL) {
    logger.info('[Redis] REDIS_URL not set — using in-memory cache fallback');
    return null;
  }

  try {
    const { createClient } = require('redis');
    redisClient = createClient({ url: process.env.REDIS_URL });

    redisClient.on('error', (err) => logger.error('[Redis] Error:', err));
    redisClient.on('connect', () => logger.info('[Redis] Connected'));

    await redisClient.connect();
    return redisClient;
  } catch (err) {
    logger.warn('[Redis] Failed to connect — using in-memory fallback:', err.message);
    return null;
  }
}

function getRedisClient() {
  return redisClient;
}

async function cacheSet(key, value, ttlSeconds = 3600) {
  const serialized = JSON.stringify(value);

  if (redisClient?.isReady) {
    await redisClient.set(key, serialized, { EX: ttlSeconds });
  } else {
    memoryCache.set(key, { value: serialized, expiresAt: Date.now() + ttlSeconds * 1000 });
  }
}

async function cacheGet(key) {
  if (redisClient?.isReady) {
    const val = await redisClient.get(key);
    return val ? JSON.parse(val) : null;
  }

  const entry = memoryCache.get(key);
  if (!entry) return null;

  if (Date.now() > entry.expiresAt) {
    memoryCache.delete(key);
    return null;
  }

  return JSON.parse(entry.value);
}

async function cacheDel(key) {
  if (redisClient?.isReady) {
    await redisClient.del(key);
  } else {
    memoryCache.delete(key);
  }
}

async function cacheDelPattern(pattern) {
  if (redisClient?.isReady) {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) await redisClient.del(keys);
  } else {
    const regex = new RegExp(pattern.replace('*', '.*'));
    for (const key of memoryCache.keys()) {
      if (regex.test(key)) memoryCache.delete(key);
    }
  }
}

module.exports = { initializeRedis, getRedisClient, cacheSet, cacheGet, cacheDel, cacheDelPattern };
