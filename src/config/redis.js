const Redis = require('ioredis');
const logger = require('../utils/logger');

let redis = null;

/**
 * Create and configure Redis client
 */
const createRedisClient = () => {
  if (redis) return redis;

  redis = new Redis({
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB) || 0,
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: false,
  });

  redis.on('connect', () => {
    logger.info('✅ Redis connected');
  });

  redis.on('ready', () => {
    logger.info('Redis ready to accept commands');
  });

  redis.on('error', (err) => {
    logger.error('Redis connection error:', err.message);
  });

  redis.on('close', () => {
    logger.warn('Redis connection closed');
  });

  redis.on('reconnecting', () => {
    logger.info('Redis reconnecting...');
  });

  return redis;
};

/**
 * Get or create Redis client
 */
const getRedis = () => {
  if (!redis) {
    return createRedisClient();
  }
  return redis;
};

/**
 * Disconnect Redis (for graceful shutdown)
 */
const disconnectRedis = async () => {
  if (redis) {
    await redis.quit();
    redis = null;
    logger.info('Redis connection closed');
  }
};

module.exports = { createRedisClient, getRedis, disconnectRedis };
