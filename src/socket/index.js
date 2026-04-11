const { Server } = require('socket.io');
const { socketAuth } = require('../middlewares/socketAuth.middleware');
const chatHandler = require('./chat.handler');
const presenceHandler = require('./presence.handler');
const callHandler = require('./call.handler');
const logger = require('../utils/logger');
const presenceService = require('../services/presence.service');
const messageService = require('../services/message.service');
const Conversation = require('../models/Conversation');

let io = null;

/**
 * Initialize Socket.IO
 */
const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGINS?.split(',') || '*',
      methods: ['GET', 'POST'],
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    maxHttpBufferSize: 1e6, // 1MB
  });

  // Authentication middleware
  io.use(socketAuth);

  io.on('connection', async (socket) => {
    const userId = socket.userId;
    logger.info(`🔌 Socket connected: ${socket.id} (User: ${userId})`);

    try {
      // Set user online
      await presenceService.setOnline(userId, socket.id);

      // Join user's personal room
      socket.join(`user:${userId}`);

      // Join all conversation rooms
      const conversations = await Conversation.find({
        'participants.user': userId,
        'participants.deletedAt': null,
        isActive: true,
      }).select('_id');

      conversations.forEach(conv => {
        socket.join(`conv:${conv._id}`);
      });

      // Deliver queued messages
      const queuedMessages = await messageService.getQueuedMessages(userId);
      if (queuedMessages.length > 0) {
        logger.info(`Delivering ${queuedMessages.length} queued messages to ${userId}`);
        for (const msg of queuedMessages) {
          socket.emit('message:receive', msg);
        }
      }

      // Notify friends
      const User = require('../models/User');
      const user = await User.findById(userId).select('friends customStatusText customStatusEmoji');
      if (user?.friends?.length > 0) {
        user.friends.forEach(friendId => {
          io.to(`user:${friendId}`).emit('friend:online', {
            userId,
            customStatus: {
              text: user.customStatusText,
              emoji: user.customStatusEmoji,
            },
          });
        });
      }

      // Send connected event
      const onlineFriends = [];
      if (user?.friends) {
        for (const friendId of user.friends) {
          if (await presenceService.isOnline(friendId)) {
            onlineFriends.push(friendId.toString());
          }
        }
      }

      socket.emit('connected', {
        userId,
        serverTime: Date.now(),
        onlineFriends,
        pendingMessages: queuedMessages.length,
      });

      // Register event handlers
      chatHandler(io, socket);
      presenceHandler(io, socket);
      callHandler(io, socket);

      // === Heartbeat ===
      socket.on('heartbeat', async () => {
        await presenceService.heartbeat(userId);
        socket.emit('heartbeat:ack', { serverTime: Date.now() });
      });

      // === Sync Events ===
      socket.on('sync:conversations', async ({ since, limit }) => {
        const query = { 'participants.user': userId, isActive: true };
        if (since) query.updatedAt = { $gt: new Date(since) };

        const conversations = await Conversation.find(query)
          .populate('participants.user', 'displayName avatar isOnline')
          .populate('lastMessage.sender', 'displayName')
          .sort({ updatedAt: -1 })
          .limit(limit || 50);

        socket.emit('sync:conversations_result', {
          conversations,
          hasMore: conversations.length === (limit || 50),
        });
      });

      socket.on('sync:unread_counts', async () => {
        const conversations = await Conversation.find({
          'participants.user': userId,
          isActive: true,
        }).select('_id participants');

        const counts = {};
        conversations.forEach(conv => {
          const participant = conv.getParticipant(userId);
          if (participant) {
            counts[conv._id.toString()] = participant.unreadCount || 0;
          }
        });

        socket.emit('sync:unread_result', { counts });
      });

    } catch (error) {
      logger.error('Socket connection setup error:', error);
    }

    // === Disconnect ===
    socket.on('disconnect', async (reason) => {
      logger.info(`🔌 Socket disconnected: ${socket.id} (User: ${userId}, Reason: ${reason})`);

      try {
        const result = await presenceService.setOffline(userId, socket.id);

        if (result.isFullyOffline) {
          // Notify friends
          const user = await User.findById(userId).select('friends');
          if (user?.friends) {
            user.friends.forEach(friendId => {
              io.to(`user:${friendId}`).emit('friend:offline', {
                userId,
                lastSeen: result.lastSeen,
              });
            });
          }
        }
      } catch (error) {
        logger.error('Socket disconnect cleanup error:', error);
      }
    });
  });

  logger.info('✅ Socket.IO initialized');
  return io;
};

/**
 * Get Socket.IO instance
 */
const getIO = () => {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
};

module.exports = { initSocket, getIO };
