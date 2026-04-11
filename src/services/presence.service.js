const { getRedis } = require('../config/redis');
const { REDIS_KEYS, TIMEOUTS } = require('../config/constants');
const User = require('../models/User');
const logger = require('../utils/logger');

class PresenceService {
  /**
   * Set user online
   */
  async setOnline(userId, socketId) {
    const redis = getRedis();

    await Promise.all([
      redis.set(REDIS_KEYS.USER_ONLINE(userId), 'true', 'EX', TIMEOUTS.PRESENCE_TTL),
      redis.sadd(REDIS_KEYS.USER_SOCKETS(userId), socketId),
      redis.set(REDIS_KEYS.SOCKET_USER(socketId), userId),
    ]);

    // Update MongoDB (eventual consistency)
    await User.findByIdAndUpdate(userId, {
      isOnline: true,
    });
  }

  /**
   * Set user offline
   */
  async setOffline(userId, socketId) {
    const redis = getRedis();

    // Remove this socket
    await redis.srem(REDIS_KEYS.USER_SOCKETS(userId), socketId);
    await redis.del(REDIS_KEYS.SOCKET_USER(socketId));

    // Check if user has remaining sockets
    const remainingSockets = await redis.scard(REDIS_KEYS.USER_SOCKETS(userId));

    if (remainingSockets === 0) {
      // Fully offline
      const now = Date.now();
      await Promise.all([
        redis.del(REDIS_KEYS.USER_ONLINE(userId)),
        redis.set(REDIS_KEYS.USER_LAST_SEEN(userId), now.toString()),
        redis.del(REDIS_KEYS.USER_APP_FOREGROUND(userId)),
      ]);

      await User.findByIdAndUpdate(userId, {
        isOnline: false,
        lastSeen: new Date(now),
      });

      return { isFullyOffline: true, lastSeen: new Date(now) };
    }

    return { isFullyOffline: false };
  }

  /**
   * Check if user is online
   */
  async isOnline(userId) {
    const redis = getRedis();
    const online = await redis.get(REDIS_KEYS.USER_ONLINE(userId));
    return online === 'true';
  }

  /**
   * Get last seen
   */
  async getLastSeen(userId) {
    const redis = getRedis();
    const lastSeen = await redis.get(REDIS_KEYS.USER_LAST_SEEN(userId));
    return lastSeen ? new Date(parseInt(lastSeen)) : null;
  }

  /**
   * Heartbeat — refresh online TTL
   */
  async heartbeat(userId) {
    const redis = getRedis();
    await Promise.all([
      redis.set(REDIS_KEYS.USER_ONLINE(userId), 'true', 'EX', TIMEOUTS.PRESENCE_TTL),
      redis.set(REDIS_KEYS.USER_APP_FOREGROUND(userId), 'true', 'EX', TIMEOUTS.APP_FOREGROUND_TTL),
    ]);
  }

  /**
   * Set typing status
   */
  async setTyping(userId, conversationId, isTyping) {
    const redis = getRedis();
    const key = REDIS_KEYS.USER_TYPING(userId, conversationId);

    if (isTyping) {
      await redis.set(key, 'true', 'EX', 5); // 5s auto-expire
    } else {
      await redis.del(key);
    }
  }

  /**
   * Update custom status
   */
  async updateCustomStatus(userId, text, emoji) {
    const redis = getRedis();
    await redis.set(
      REDIS_KEYS.USER_CUSTOM_STATUS(userId),
      JSON.stringify({ text, emoji }),
      'EX', 86400 // 24h cache
    );

    await User.findByIdAndUpdate(userId, {
      customStatusText: text || '',
      customStatusEmoji: emoji || '',
    });
  }

  /**
   * Get custom status
   */
  async getCustomStatus(userId) {
    const redis = getRedis();
    const status = await redis.get(REDIS_KEYS.USER_CUSTOM_STATUS(userId));
    return status ? JSON.parse(status) : { text: '', emoji: '' };
  }

  /**
   * Get presence for multiple users
   */
  async getPresenceBatch(userIds) {
    const redis = getRedis();
    const pipeline = redis.pipeline();

    userIds.forEach(id => {
      pipeline.get(REDIS_KEYS.USER_ONLINE(id));
      pipeline.get(REDIS_KEYS.USER_LAST_SEEN(id));
      pipeline.get(REDIS_KEYS.USER_CUSTOM_STATUS(id));
    });

    const results = await pipeline.exec();

    return userIds.map((id, i) => ({
      id,
      isOnline: results[i * 3][1] === 'true',
      lastSeen: results[i * 3 + 1][1] ? new Date(parseInt(results[i * 3 + 1][1])) : null,
      customStatus: results[i * 3 + 2][1] ? JSON.parse(results[i * 3 + 2][1]) : null,
    }));
  }

  /**
   * Get all socket IDs for a user
   */
  async getUserSockets(userId) {
    const redis = getRedis();
    return redis.smembers(REDIS_KEYS.USER_SOCKETS(userId));
  }
}

module.exports = new PresenceService();
