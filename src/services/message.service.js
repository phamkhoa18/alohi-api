const MessageMetadata = require('../models/MessageMetadata');
const MessageQueue = require('../models/MessageQueue');
const Conversation = require('../models/Conversation');
const { getRedis } = require('../config/redis');
const { generateMessageId, generateMessagePreview, truncateText } = require('../utils/helpers');
const { REDIS_KEYS, RECALL_WINDOW_MS } = require('../config/constants');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');

class MessageService {
  /**
   * Process a new message (called from Socket handler or REST)
   */
  async processMessage(senderId, conversationId, messageData) {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation || !conversation.isParticipant(senderId)) {
      throw ApiError.forbidden('Không có quyền gửi tin nhắn trong hội thoại này');
    }

    // Check group settings
    if (conversation.type === 'group' && conversation.group?.settings?.onlyAdminCanSend) {
      if (!conversation.isAdmin(senderId)) {
        throw ApiError.forbidden('Chỉ admin mới có thể gửi tin nhắn');
      }
    }

    const messageId = generateMessageId();
    const preview = generateMessagePreview(messageData.type, messageData.content);
    const timestamp = new Date();

    // Save metadata to MongoDB
    await MessageMetadata.create({
      messageId,
      conversation: conversationId,
      sender: senderId,
      type: messageData.type,
      preview: truncateText(preview, 100),
      createdAt: timestamp,
    });

    // Update conversation lastMessage
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: {
        _id: messageId,
        sender: senderId,
        type: messageData.type,
        preview: truncateText(preview, 100),
        timestamp,
      },
      $inc: { totalMessages: 1 },
    });

    // Increment unread count for all other participants
    await Conversation.updateOne(
      { _id: conversationId },
      {
        $inc: {
          'participants.$[other].unreadCount': 1,
        },
      },
      {
        arrayFilters: [{ 'other.user': { $ne: senderId } }],
      }
    );

    return {
      messageId,
      conversationId,
      sender: senderId,
      type: messageData.type,
      content: messageData.content,
      encryptedContent: messageData.encryptedContent,
      attachments: messageData.attachments,
      replyTo: messageData.replyTo,
      mentions: messageData.mentions,
      sticker: messageData.sticker,
      location: messageData.location,
      sharedContact: messageData.sharedContact,
      preview,
      timestamp,
    };
  }

  /**
   * Queue message for offline recipient
   */
  async queueMessage(recipientId, messagePayload) {
    const redis = getRedis();

    // Store in Redis sorted set (score = timestamp for ordering)
    await redis.zadd(
      REDIS_KEYS.QUEUE(recipientId),
      messagePayload.timestamp.getTime(),
      JSON.stringify(messagePayload)
    );

    // Also save to MongoDB as backup
    await MessageQueue.create({
      messageId: messagePayload.messageId,
      clientMessageId: messagePayload.clientMessageId,
      conversation: messagePayload.conversationId,
      sender: messagePayload.sender,
      recipient: recipientId,
      type: messagePayload.type,
      content: messagePayload.content,
      encryptedContent: messagePayload.encryptedContent,
      attachments: messagePayload.attachments,
      replyTo: messagePayload.replyTo,
      mentions: messagePayload.mentions,
      sticker: messagePayload.sticker,
      location: messagePayload.location,
      sharedContact: messagePayload.sharedContact,
      status: 'queued',
    });

    logger.debug(`Message queued for ${recipientId}: ${messagePayload.messageId}`);
  }

  /**
   * Get queued messages for a user
   */
  async getQueuedMessages(userId) {
    const redis = getRedis();
    const messages = await redis.zrangebyscore(
      REDIS_KEYS.QUEUE(userId),
      '-inf', '+inf'
    );

    return messages.map(m => JSON.parse(m));
  }

  /**
   * Acknowledge a message delivery
   */
  async acknowledgeMessage(userId, messageId) {
    const redis = getRedis();

    // Find and remove from Redis queue
    const messages = await redis.zrangebyscore(REDIS_KEYS.QUEUE(userId), '-inf', '+inf');
    for (const msg of messages) {
      const parsed = JSON.parse(msg);
      if (parsed.messageId === messageId) {
        await redis.zrem(REDIS_KEYS.QUEUE(userId), msg);
        break;
      }
    }

    // Update MongoDB queue
    await MessageQueue.findOneAndUpdate(
      { messageId, recipient: userId },
      { status: 'delivered', deliveredAt: new Date() }
    );

    // Update metadata delivery tracking
    await MessageMetadata.findOneAndUpdate(
      { messageId },
      {
        $addToSet: {
          deliveredTo: { user: userId, deliveredAt: new Date() },
        },
      }
    );
  }

  /**
   * Mark messages as read
   */
  async markAsRead(userId, conversationId, messageId) {
    // Update metadata
    if (messageId) {
      await MessageMetadata.findOneAndUpdate(
        { messageId },
        {
          $addToSet: {
            readBy: { user: userId, readAt: new Date() },
          },
        }
      );
    }

    // Reset unread count
    await Conversation.updateOne(
      { _id: conversationId, 'participants.user': userId },
      {
        $set: {
          'participants.$.unreadCount': 0,
          'participants.$.lastReadAt': new Date(),
          'participants.$.lastReadMessageId': messageId,
        },
      }
    );
  }

  /**
   * Recall a message (within 24h)
   */
  async recallMessage(userId, messageId) {
    const metadata = await MessageMetadata.findOne({ messageId });
    if (!metadata) throw ApiError.notFound('Tin nhắn không tồn tại');
    if (metadata.sender.toString() !== userId.toString()) {
      throw ApiError.forbidden('Chỉ người gửi mới có thể thu hồi');
    }

    // Check recall window
    const timeSinceSent = Date.now() - metadata.createdAt.getTime();
    if (timeSinceSent > RECALL_WINDOW_MS) {
      throw ApiError.badRequest('Đã quá thời gian thu hồi (24 giờ)');
    }

    metadata.isRecalled = true;
    metadata.recalledAt = new Date();
    await metadata.save();

    // Update conversation lastMessage if this was the last message
    await Conversation.updateOne(
      { _id: metadata.conversation, 'lastMessage._id': messageId },
      { $set: { 'lastMessage.isRecalled': true, 'lastMessage.preview': 'Tin nhắn đã được thu hồi' } }
    );

    return metadata;
  }

  /**
   * Delete a message for self
   */
  async deleteMessageForSelf(userId, messageId) {
    await MessageMetadata.findOneAndUpdate(
      { messageId },
      { $addToSet: { deletedFor: userId } }
    );
  }

  /**
   * React to a message
   */
  async reactToMessage(userId, messageId, emoji) {
    const metadata = await MessageMetadata.findOne({ messageId });
    if (!metadata) throw ApiError.notFound('Tin nhắn không tồn tại');

    // Remove existing reaction from same user
    metadata.reactions = metadata.reactions.filter(
      r => r.user.toString() !== userId.toString()
    );

    if (emoji) {
      metadata.reactions.push({ user: userId, emoji, createdAt: new Date() });
    }

    await metadata.save();

    return metadata;
  }

  /**
   * Remove reaction from a message
   */
  async removeReaction(userId, messageId) {
    await MessageMetadata.findOneAndUpdate(
      { messageId },
      { $pull: { reactions: { user: userId } } }
    );
  }

  /**
   * Check for duplicate message (deduplication)
   */
  async isDuplicate(conversationId, clientMessageId) {
    if (!clientMessageId) return false;

    const redis = getRedis();
    const key = REDIS_KEYS.DEDUP(conversationId);
    const exists = await redis.sismember(key, clientMessageId);

    if (!exists) {
      await redis.sadd(key, clientMessageId);
      await redis.expire(key, 86400); // 24h TTL
    }

    return exists;
  }
}

module.exports = new MessageService();
