const presenceService = require('../services/presence.service');
const logger = require('../utils/logger');

module.exports = (io, socket) => {
  const userId = socket.userId;

  // === typing:start ===
  socket.on('typing:start', async ({ conversationId }) => {
    try {
      await presenceService.setTyping(userId, conversationId, true);
      socket.to(`conv:${conversationId}`).emit('typing:update', {
        conversationId,
        userId,
        displayName: socket.user.displayName,
        isTyping: true,
      });
    } catch (error) {
      logger.error('typing:start error:', error);
    }
  });

  // === typing:stop ===
  socket.on('typing:stop', async ({ conversationId }) => {
    try {
      await presenceService.setTyping(userId, conversationId, false);
      socket.to(`conv:${conversationId}`).emit('typing:update', {
        conversationId,
        userId,
        displayName: socket.user.displayName,
        isTyping: false,
      });
    } catch (error) {
      logger.error('typing:stop error:', error);
    }
  });

  // === presence:get ===
  socket.on('presence:get', async ({ userIds }) => {
    try {
      const results = await presenceService.getPresenceBatch(userIds);
      socket.emit('presence:result', { users: results });
    } catch (error) {
      logger.error('presence:get error:', error);
    }
  });

  // === status:update ===
  socket.on('status:update', async ({ text, emoji }) => {
    try {
      await presenceService.updateCustomStatus(userId, text, emoji);

      // Broadcast to friends
      const User = require('../models/User');
      const user = await User.findById(userId).select('friends');
      if (user?.friends) {
        user.friends.forEach(friendId => {
          io.to(`user:${friendId}`).emit('status:changed', {
            userId,
            text,
            emoji,
          });
        });
      }
    } catch (error) {
      logger.error('status:update error:', error);
    }
  });
};
