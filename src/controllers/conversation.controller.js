const Conversation = require('../models/Conversation');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const presenceService = require('../services/presence.service');

// @desc    Get conversation list
exports.getConversations = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { cursor, limit = 20 } = req.query;
  const parsedLimit = Math.min(parseInt(limit) || 20, 50);

  const query = {
    'participants.user': userId,
    'participants.isHidden': { $ne: true },
    'participants.isArchived': { $ne: true },
    'participants.deletedAt': null,
    isActive: true,
  };

  if (cursor) {
    query.updatedAt = { $lt: new Date(cursor) };
  }

  const conversations = await Conversation.find(query)
    .populate('participants.user', 'displayName avatar isOnline lastSeen')
    .populate('lastMessage.sender', 'displayName')
    .sort({ updatedAt: -1 })
    .limit(parsedLimit + 1)
    .lean();

  const hasMore = conversations.length > parsedLimit;
  const results = hasMore ? conversations.slice(0, parsedLimit) : conversations;
  
  // Inject real-time presence from Redis to fix zombie online status from MongoDB
  const userIds = [...new Set(results.flatMap(c => c.participants.map(p => p.user?._id?.toString()).filter(Boolean)))];
  if (userIds.length > 0) {
    const presenceStats = await presenceService.getPresenceBatch(userIds);
    const presenceMap = {};
    presenceStats.forEach(p => { presenceMap[p.id] = p; });

    results.forEach(c => {
      c.participants.forEach(p => {
        if (p.user && presenceMap[p.user._id.toString()]) {
          p.user.isOnline = presenceMap[p.user._id.toString()].isOnline;
          if (presenceMap[p.user._id.toString()].lastSeen) {
            p.user.lastSeen = presenceMap[p.user._id.toString()].lastSeen;
          }
        }
      });
    });
  }

  // Inject blocked status so frontend knows if we are blocked
  const targetUserIds = results.flatMap(c => c.participants.map(p => p.user && p.user._id ? p.user._id.toString() : null).filter(Boolean));
  if (targetUserIds.length > 0) {
      const User = require('../models/User');
      const targetUsers = await User.find({ _id: { $in: targetUserIds } }).select('blockedUsers');
      const targetUserBlockMap = {};
      targetUsers.forEach(u => {
          targetUserBlockMap[u._id.toString()] = u.blockedUsers.map(b => b.toString());
      });

      results.forEach(c => {
          c.participants.forEach(p => {
              if (p.user && p.user._id) {
                  // Attach a custom field hasBlockedMe to the user to signify if the current user is blocked
                  const theirBlockedList = targetUserBlockMap[p.user._id.toString()] || [];
                  p.user.hasBlockedMe = theirBlockedList.includes(userId.toString());
              }
          });
      });
  }

  const nextCursor = hasMore && results.length > 0
    ? results[results.length - 1].updatedAt.toISOString()
    : null;

  ApiResponse.paginated(results, { nextCursor, hasMore, limit: parsedLimit }).send(res);
});

// @desc    Get pinned conversations
exports.getPinnedConversations = asyncHandler(async (req, res) => {
  const conversations = await Conversation.find({
    'participants': {
      $elemMatch: { user: req.user._id, isPinned: true, deletedAt: null },
    },
    isActive: true,
  })
    .populate('participants.user', 'displayName avatar isOnline')
    .populate('lastMessage.sender', 'displayName')
    .sort({ updatedAt: -1 })
    .lean();

  new ApiResponse(200, 'Success', conversations).send(res);
});

// @desc    Get archived conversations
exports.getArchivedConversations = asyncHandler(async (req, res) => {
  const conversations = await Conversation.find({
    'participants': {
      $elemMatch: { user: req.user._id, isArchived: true, deletedAt: null },
    },
    isActive: true,
  })
    .populate('participants.user', 'displayName avatar')
    .sort({ updatedAt: -1 })
    .lean();

  new ApiResponse(200, 'Success', conversations).send(res);
});

// @desc    Get single conversation
exports.getConversation = asyncHandler(async (req, res) => {
  const conversation = await Conversation.findById(req.params.id)
    .populate('participants.user', 'displayName avatar isOnline lastSeen bio');

  if (!conversation || !conversation.isParticipant(req.user._id)) {
    throw ApiError.notFound('Hội thoại không tồn tại');
  }

  if (conversation.participants) {
    const userIds = conversation.participants.map(p => p.user?._id?.toString()).filter(Boolean);
    if (userIds.length > 0) {
      const presenceStats = await presenceService.getPresenceBatch(userIds);
      const presenceMap = {};
      presenceStats.forEach(p => { presenceMap[p.id] = p; });

      conversation.participants.forEach(p => {
        if (p.user && presenceMap[p.user._id.toString()]) {
          p.user.isOnline = presenceMap[p.user._id.toString()].isOnline;
          if (presenceMap[p.user._id.toString()].lastSeen) {
            p.user.lastSeen = presenceMap[p.user._id.toString()].lastSeen;
          }
        }
      });
      
      const User = require('../models/User');
      const targetUsers = await User.find({ _id: { $in: userIds } }).select('blockedUsers');
      const targetUserBlockMap = {};
      targetUsers.forEach(u => {
          targetUserBlockMap[u._id.toString()] = u.blockedUsers.map(b => b.toString());
      });
      
      conversation.participants.forEach(p => {
          if (p.user && p.user._id) {
              const theirBlockedList = targetUserBlockMap[p.user._id.toString()] || [];
              const rawObj = p.user.toJSON ? p.user.toJSON() : p.user;
              rawObj.hasBlockedMe = theirBlockedList.includes(req.user._id.toString());
              if (p.user.set) p.user.set('hasBlockedMe', rawObj.hasBlockedMe, { strict: false });
          }
      });
    }
  }

  const payload = conversation.toJSON ? conversation.toJSON() : conversation;
  new ApiResponse(200, 'Success', payload).send(res);
});

// @desc    Create/open 1-1 conversation
exports.createConversation = asyncHandler(async (req, res) => {
  const { userId } = req.body;
  const myId = req.user._id;

  if (myId.toString() === userId) {
    throw ApiError.badRequest('Không thể tạo hội thoại với chính mình');
  }

  // Check existing
  let conversation = await Conversation.findOne({
    type: 'private',
    'participants.user': { $all: [myId, userId] },
    $expr: { $eq: [{ $size: '$participants' }, 2] },
  }).populate('participants.user', 'displayName avatar isOnline lastSeen');

  if (conversation) {
    // Un-hide/un-delete if needed
    await Conversation.updateOne(
      { _id: conversation._id, 'participants.user': myId },
      { $set: { 'participants.$.isHidden': false, 'participants.$.deletedAt': null } }
    );
    new ApiResponse(200, 'Hội thoại đã tồn tại', conversation).send(res);
    return;
  }

  // Create new conversation
  conversation = await Conversation.create({
    type: 'private',
    participants: [
      { user: myId, role: 'member' },
      { user: userId, role: 'member' },
    ],
  });

  conversation = await conversation.populate('participants.user', 'displayName avatar isOnline lastSeen');

  new ApiResponse(201, 'Đã tạo hội thoại', conversation).send(res);
});

// @desc    Mute conversation
exports.muteConversation = asyncHandler(async (req, res) => {
  const { duration } = req.body || {}; // ms, null = forever
  const mutedUntil = duration ? new Date(Date.now() + duration) : null;

  await Conversation.updateOne(
    { _id: req.params.id, 'participants.user': req.user._id },
    { $set: { 'participants.$.isMuted': true, 'participants.$.mutedUntil': mutedUntil } }
  );

  new ApiResponse(200, 'Đã tắt thông báo').send(res);
});

// @desc    Unmute conversation
exports.unmuteConversation = asyncHandler(async (req, res) => {
  await Conversation.updateOne(
    { _id: req.params.id, 'participants.user': req.user._id },
    { $set: { 'participants.$.isMuted': false, 'participants.$.mutedUntil': null } }
  );
  new ApiResponse(200, 'Đã bật lại thông báo').send(res);
});

// @desc    Pin conversation
exports.pinConversation = asyncHandler(async (req, res) => {
  await Conversation.updateOne(
    { _id: req.params.id, 'participants.user': req.user._id },
    { $set: { 'participants.$.isPinned': true } }
  );
  new ApiResponse(200, 'Đã ghim hội thoại').send(res);
});

// @desc    Unpin conversation
exports.unpinConversation = asyncHandler(async (req, res) => {
  await Conversation.updateOne(
    { _id: req.params.id, 'participants.user': req.user._id },
    { $set: { 'participants.$.isPinned': false } }
  );
  new ApiResponse(200, 'Đã bỏ ghim hội thoại').send(res);
});

// @desc    Archive conversation
exports.archiveConversation = asyncHandler(async (req, res) => {
  await Conversation.updateOne(
    { _id: req.params.id, 'participants.user': req.user._id },
    { $set: { 'participants.$.isArchived': true } }
  );
  new ApiResponse(200, 'Đã lưu trữ hội thoại').send(res);
});

// @desc    Unarchive conversation
exports.unarchiveConversation = asyncHandler(async (req, res) => {
  await Conversation.updateOne(
    { _id: req.params.id, 'participants.user': req.user._id },
    { $set: { 'participants.$.isArchived': false } }
  );
  new ApiResponse(200, 'Đã bỏ lưu trữ').send(res);
});

// @desc    Hide conversation
exports.hideConversation = asyncHandler(async (req, res) => {
  await Conversation.updateOne(
    { _id: req.params.id, 'participants.user': req.user._id },
    { $set: { 'participants.$.isHidden': true } }
  );
  new ApiResponse(200, 'Đã ẩn hội thoại').send(res);
});

// @desc    Delete conversation (for self)
exports.deleteConversation = asyncHandler(async (req, res) => {
  await Conversation.updateOne(
    { _id: req.params.id, 'participants.user': req.user._id },
    { $set: { 'participants.$.deletedAt': new Date() } }
  );
  new ApiResponse(200, 'Đã xóa hội thoại').send(res);
});

// @desc    Clear chat history (for self)
exports.clearHistory = asyncHandler(async (req, res) => {
  await Conversation.updateOne(
    { _id: req.params.id, 'participants.user': req.user._id },
    { $set: { 'participants.$.clearHistoryAt': new Date() } }
  );
  new ApiResponse(200, 'Đã xóa lịch sử tin nhắn').send(res);
});

// @desc    Get conversation members
exports.getMembers = asyncHandler(async (req, res) => {
  const conversation = await Conversation.findById(req.params.id)
    .populate('participants.user', 'displayName avatar isOnline lastSeen bio');

  if (!conversation || !conversation.isParticipant(req.user._id)) {
    throw ApiError.notFound('Hội thoại không tồn tại');
  }

  new ApiResponse(200, 'Success', conversation.participants).send(res);
});
