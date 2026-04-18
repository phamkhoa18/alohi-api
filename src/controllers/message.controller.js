const messageService = require('../services/message.service');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const MessageMetadata = require('../models/MessageMetadata');
const Conversation = require('../models/Conversation');
const MessageQueue = require('../models/MessageQueue');
const presenceService = require('../services/presence.service');

// @desc    Get messages in conversation
// @route   GET /api/messages/:conversationId
exports.getMessages = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const { page = 1, limit = 50 } = req.query;
  const parsedLimit = Math.min(parseInt(limit) || 50, 100);
  const skip = (parseInt(page) - 1) * parsedLimit;

  // Verify participant
  const conversation = await Conversation.findById(conversationId);
  if (!conversation || !conversation.isParticipant(req.user._id)) {
    throw ApiError.forbidden('Không có quyền xem tin nhắn');
  }

  const messagesMeta = await MessageMetadata.find({
    conversation: conversationId,
    isRecalled: { $ne: true },
    deletedFor: { $nin: [req.user._id] },
  })
    .populate('sender', 'displayName avatar isOnline')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parsedLimit)
    .lean();

  messagesMeta.reverse(); // Reverse back to chronological order for the client

  // Merge content from MessageQueue (kept for 30 days securely)
  const metaIds = messagesMeta.map(m => m.messageId);
  const queueDocs = await MessageQueue.find({ messageId: { $in: metaIds } }).lean();

  const messages = messagesMeta.map(meta => {
    const q = queueDocs.find(doc => doc.messageId === meta.messageId);
    return {
      ...meta,
      content: meta.content || (q ? q.content : meta.preview), // Native content first, queue fallback, preview last
      attachments: (meta.attachments && meta.attachments.length > 0) ? meta.attachments : (q ? q.attachments : []),
      encryptedContent: meta.encryptedContent || (q ? q.encryptedContent : null),
    };
  });

  const userIds = [...new Set(messages.map(m => m.sender?._id?.toString()).filter(Boolean))];
  if (userIds.length > 0) {
    const presenceStats = await presenceService.getPresenceBatch(userIds);
    const presenceMap = {};
    presenceStats.forEach(p => { presenceMap[p.id] = p; });
    
    messages.forEach(m => {
      if (m.sender && presenceMap[m.sender._id.toString()]) {
        m.sender.isOnline = presenceMap[m.sender._id.toString()].isOnline;
        if (presenceMap[m.sender._id.toString()].lastSeen) {
          m.sender.lastSeen = presenceMap[m.sender._id.toString()].lastSeen;
        }
      }
    });
  }

  const total = await MessageMetadata.countDocuments({
    conversation: conversationId,
    isRecalled: { $ne: true },
  });

  new ApiResponse(200, 'Success', { messages, total }).send(res);
});

// @desc    Send message (REST fallback)
exports.sendMessage = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;

  // Check dedup
  if (req.body.clientMessageId) {
    const isDup = await messageService.isDuplicate(conversationId, req.body.clientMessageId);
    if (isDup) {
      new ApiResponse(200, 'Tin nhắn trùng lặp', { duplicate: true }).send(res);
      return;
    }
  }

  const message = await messageService.processMessage(req.user._id, conversationId, req.body);
  
  // Populate sender object so Android Retrofit (Gson) doesn't crash expecting an object instead of string ID
  const populatedMessage = {
    ...message,
    sender: {
      _id: req.user._id,
      displayName: req.user.displayName,
      avatar: req.user.avatar,
      isOnline: req.user.isOnline
    }
  };

  // Broadcast using Socket.IO exactly like chat.handler.js
  try {
    const io = require('../socket').getIO();
    const presenceService = require('../services/presence.service');
    const notificationService = require('../services/notification.service');
    const conv = await Conversation.findById(conversationId).populate('participants.user', '_id');
    
    if (conv) {
      for (const participant of conv.participants) {
        const recipientId = participant.user._id.toString();
        if (recipientId === req.user._id.toString()) continue;

        const isOnline = await presenceService.isOnline(recipientId);
        
        if (isOnline) {
          io.to(`user:${recipientId}`).emit('message:receive', {
            messageId: message.messageId,
            conversationId,
            sender: populatedMessage.sender,
            type: message.type,
            content: message.content,
            encryptedContent: message.encryptedContent,
            attachments: message.attachments,
            replyTo: req.body.replyTo,
            preview: message.preview,
            timestamp: message.timestamp,
          });
        }
        
        // Push Notification for offline or background users
        // NOTE: Even if online, app might be in background, but we rely on FCM if app handles data messages
        await notificationService.create({
          recipientId,
          senderId: req.user._id,
          type: 'new_message',
          title: req.user.displayName,
          body: message.preview,
          imageUrl: req.user.avatar?.thumbnailUrl,
          data: { conversationId, messageId: message.messageId },
        });
      }
    }
  } catch (error) {
    console.error('REST broadcast socket/FCM error:', error);
  }
  
  new ApiResponse(201, 'Đã gửi tin nhắn', populatedMessage).send(res);
});

// @desc    Recall message
exports.recallMessage = asyncHandler(async (req, res) => {
  const metadata = await messageService.recallMessage(req.user._id, req.params.messageId);
  new ApiResponse(200, 'Đã thu hồi tin nhắn', metadata).send(res);
});

// @desc    Delete message for self
exports.deleteMessage = asyncHandler(async (req, res) => {
  await messageService.deleteMessageForSelf(req.user._id, req.params.messageId);
  new ApiResponse(200, 'Đã xóa tin nhắn').send(res);
});

// @desc    React to message
exports.reactToMessage = asyncHandler(async (req, res) => {
  const metadata = await messageService.reactToMessage(req.user._id, req.params.messageId, req.body.emoji);
  new ApiResponse(200, 'Đã react', metadata).send(res);
});

// @desc    Remove reaction
exports.removeReaction = asyncHandler(async (req, res) => {
  await messageService.removeReaction(req.user._id, req.params.messageId);
  new ApiResponse(200, 'Đã bỏ react').send(res);
});

// @desc    Forward message
exports.forwardMessage = asyncHandler(async (req, res) => {
  const { targetConversationIds } = req.body;
  const MessageMetadata = require('../models/MessageMetadata');
  const originalMeta = await MessageMetadata.findOne({ messageId: req.params.messageId });

  if (!originalMeta) throw ApiError.notFound('Tin nhắn không tồn tại');

  const forwarded = [];
  for (const convId of targetConversationIds) {
    const msg = await messageService.processMessage(req.user._id, convId, {
      type: originalMeta.type,
      content: `Chuyển tiếp: ${originalMeta.preview}`,
      clientMessageId: require('crypto').randomUUID(),
    });
    forwarded.push(msg);
  }

  new ApiResponse(200, `Đã chuyển tiếp đến ${forwarded.length} hội thoại`, forwarded).send(res);
});

// @desc    Pin message
exports.pinMessage = asyncHandler(async (req, res) => {
  const Conversation = require('../models/Conversation');
  const MessageMetadata = require('../models/MessageMetadata');
  const conv = await Conversation.findById(req.params.conversationId);
  if (!conv || !conv.isParticipant(req.user._id)) throw ApiError.notFound('Hội thoại không tồn tại');

  const meta = await MessageMetadata.findOne({ messageId: req.params.messageId });
  if (!meta) throw ApiError.notFound('Tin nhắn không tồn tại');

  conv.pinnedMessages.push({
    messageId: req.params.messageId,
    pinnedBy: req.user._id,
    pinnedAt: new Date(),
    preview: meta.preview,
  });
  await conv.save();

  new ApiResponse(200, 'Đã ghim tin nhắn').send(res);
});

// @desc    Unpin message
exports.unpinMessage = asyncHandler(async (req, res) => {
  const Conversation = require('../models/Conversation');
  await Conversation.findByIdAndUpdate(req.params.conversationId, {
    $pull: { pinnedMessages: { messageId: req.params.messageId } },
  });

  new ApiResponse(200, 'Đã bỏ ghim tin nhắn').send(res);
});
