const messageService = require('../services/message.service');
const presenceService = require('../services/presence.service');
const notificationService = require('../services/notification.service');
const Conversation = require('../models/Conversation');
const logger = require('../utils/logger');

module.exports = (io, socket) => {
  const userId = socket.userId;

  // === message:send ===
  socket.on('message:send', async (data) => {
    try {
      if (typeof data === 'string') {
        try { data = JSON.parse(data); } catch(e) { logger.error('Failed to parse message:send data'); }
      }
      const { clientMessageId, conversationId, type, content, encryptedContent,
              attachments, replyTo, mentions, sticker, location, sharedContact } = data;

      // Deduplication
      const isDup = await messageService.isDuplicate(conversationId, clientMessageId);
      if (isDup) {
        socket.emit('message:sent', { clientMessageId, status: 'duplicate' });
        return;
      }

      // Process message
      const message = await messageService.processMessage(userId, conversationId, {
        clientMessageId,
        type,
        content,
        encryptedContent,
        attachments,
        replyTo,
        mentions,
        sticker,
        location,
        sharedContact,
      });

      // ACK to sender: ✓ (sent to server)
      socket.emit('message:sent', {
        clientMessageId,
        messageId: message.messageId,
        timestamp: message.timestamp,
        status: 'sent',
      });

      // Get conversation participants
      const conversation = await Conversation.findById(conversationId)
        .populate('participants.user', 'displayName avatar');

      // Deliver to all other participants
      for (const participant of conversation.participants) {
        const recipientId = participant.user._id.toString();
        if (recipientId === userId) continue;

        // Check if recipient is online
        const isOnline = await presenceService.isOnline(recipientId);

        if (isOnline) {
          // Send directly via socket
          io.to(`user:${recipientId}`).emit('message:receive', {
            messageId: message.messageId,
            conversationId,
            sender: {
              _id: userId,
              displayName: socket.user.displayName,
              avatar: socket.user.avatar,
            },
            type,
            content,
            encryptedContent,
            attachments,
            replyTo,
            mentions,
            sticker,
            location,
            sharedContact,
            preview: message.preview,
            timestamp: message.timestamp,
          });
        } else {
          // Queue for offline delivery
          await messageService.queueMessage(recipientId, {
            messageId: message.messageId,
            clientMessageId,
            conversationId,
            sender: userId,
            senderName: socket.user.displayName,
            senderAvatar: socket.user.avatar,
            type,
            content,
            encryptedContent,
            attachments,
            replyTo,
            mentions,
            sticker,
            location,
            sharedContact,
            preview: message.preview,
            timestamp: message.timestamp,
          });
        }

        // Send FCM push notification (notificationService checks redis appForeground internally)
        await notificationService.create({
          recipientId,
          senderId: userId,
          type: 'new_message',
          title: socket.user.displayName,
          body: message.preview,
          imageUrl: socket.user.avatar?.thumbnailUrl,
          data: { conversationId, messageId: message.messageId },
        });
      }

    } catch (error) {
      logger.error('message:send error:', error);
      socket.emit('message:error', {
        clientMessageId: data?.clientMessageId,
        error: error.message,
        code: 'SEND_FAILED',
      });
    }
  });

  // === message:ack ===
  socket.on('message:ack', async ({ messageId, conversationId }) => {
    try {
      await messageService.acknowledgeMessage(userId, messageId);

      // Notify sender: ✓✓ (delivered)
      const MessageMetadata = require('../models/MessageMetadata');
      const meta = await MessageMetadata.findOne({ messageId });
      if (meta) {
        io.to(`user:${meta.sender}`).emit('message:delivered', {
          messageId,
          conversationId,
          userId,
          deliveredAt: new Date(),
        });
      }
    } catch (error) {
      logger.error('message:ack error:', error);
    }
  });

  // === message:read ===
  socket.on('message:read', async ({ conversationId, messageId }) => {
    try {
      await messageService.markAsRead(userId, conversationId, messageId);

      // Notify sender: ✓✓ blue (read)
      const conversation = await Conversation.findById(conversationId);
      if (conversation) {
        for (const p of conversation.participants) {
          if (p.user.toString() !== userId) {
            const user = await require('../models/User').findById(userId).select('settings.privacy.readReceipts');
            if (user?.settings?.privacy?.readReceipts !== false) {
              io.to(`user:${p.user}`).emit('message:read_receipt', {
                conversationId,
                userId,
                messageId,
                readAt: new Date(),
              });
            }
          }
        }
      }
    } catch (error) {
      logger.error('message:read error:', error);
    }
  });

  // === message:recall ===
  socket.on('message:recall', async ({ messageId, conversationId }) => {
    try {
      await messageService.recallMessage(userId, messageId);

      // Broadcast to conversation
      io.to(`conv:${conversationId}`).emit('message:recalled', {
        messageId,
        conversationId,
        recalledBy: userId,
      });
    } catch (error) {
      logger.error('message:recall error:', error);
      socket.emit('message:error', {
        error: error.message,
        code: 'RECALL_FAILED',
      });
    }
  });

  // === message:delete ===
  socket.on('message:delete', async ({ messageId, conversationId }) => {
    try {
      await messageService.deleteMessageForSelf(userId, messageId);
    } catch (error) {
      logger.error('message:delete error:', error);
    }
  });

  // === message:react ===
  socket.on('message:react', async ({ messageId, conversationId, emoji }) => {
    try {
      await messageService.reactToMessage(userId, messageId, emoji);

      io.to(`conv:${conversationId}`).emit('message:react_update', {
        messageId,
        conversationId,
        userId,
        emoji,
        action: 'add',
      });
    } catch (error) {
      logger.error('message:react error:', error);
    }
  });

  // === message:forward ===
  socket.on('message:forward', async (data) => {
    try {
      if (typeof data === 'string') {
        try { data = JSON.parse(data); } catch(e) { logger.error('Failed to parse message:forward data'); }
      }
      const { messageId, targetConversationIds } = data;
      const MessageMetadata = require('../models/MessageMetadata');
      const meta = await MessageMetadata.findOne({ messageId });
      if (!meta) return;

      for (const convId of targetConversationIds) {
        const forwarded = await messageService.processMessage(userId, convId, {
          type: meta.type,
          content: `↩️ ${meta.preview}`,
          clientMessageId: require('crypto').randomUUID(),
        });

        // Get conversation participants
        const conversation = await Conversation.findById(convId).populate('participants.user', 'displayName avatar');
        
        for (const participant of conversation.participants) {
          const recipientId = participant.user._id.toString();
          if (recipientId === userId) continue;

          // Check if recipient is online
          const isOnline = await presenceService.isOnline(recipientId);
          const forwardedPayload = {
            ...forwarded,
            sender: { _id: userId, displayName: socket.user.displayName, avatar: socket.user.avatar },
            forwardedFrom: { messageId },
          };

          if (isOnline) {
            io.to(`user:${recipientId}`).emit('message:receive', forwardedPayload);
          } else {
            // Queue for offline delivery
            await messageService.queueMessage(recipientId, {
              ...forwardedPayload,
              sender: userId,
              senderName: socket.user.displayName,
              senderAvatar: socket.user.avatar,
            });
          }

          // Send FCM push notification
          await notificationService.create({
            recipientId,
            senderId: userId,
            type: 'new_message',
            title: socket.user.displayName,
            body: forwarded.preview,
            imageUrl: socket.user.avatar?.thumbnailUrl,
            data: { conversationId: convId, messageId: forwarded.messageId },
          });
        }
      }
    } catch (error) {
      logger.error('message:forward error:', error);
    }
  });

  // === message:pin ===
  socket.on('message:pin', async ({ messageId, conversationId }) => {
    io.to(`conv:${conversationId}`).emit('message:pin_update', {
      messageId,
      conversationId,
      action: 'pin',
      pinnedBy: userId,
    });
  });
};
