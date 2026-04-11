const User = require('../models/User');
const FriendRequest = require('../models/FriendRequest');
const Conversation = require('../models/Conversation');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');

class FriendService {
  /**
   * Send a friend request
   */
  async sendRequest(fromUserId, toUserId, message, source = 'search') {
    if (fromUserId.toString() === toUserId.toString()) {
      throw ApiError.badRequest('Không thể gửi lời mời kết bạn cho chính mình');
    }

    // Check if target exists
    const targetUser = await User.findById(toUserId);
    if (!targetUser || targetUser.status !== 'active') {
      throw ApiError.notFound('User không tồn tại');
    }

    // Check if blocked
    const fromUser = await User.findById(fromUserId);
    if (fromUser.blockedUsers.includes(toUserId) || targetUser.blockedUsers.includes(fromUserId)) {
      throw ApiError.forbidden('Không thể gửi lời mời kết bạn');
    }

    // Check if already friends
    if (fromUser.friends.includes(toUserId)) {
      throw ApiError.conflict('Đã là bạn bè');
    }

    // Check existing request
    const existingRequest = await FriendRequest.findOne({
      $or: [
        { from: fromUserId, to: toUserId, status: 'pending' },
        { from: toUserId, to: fromUserId, status: 'pending' },
      ],
    });

    if (existingRequest) {
      if (existingRequest.from.toString() === fromUserId.toString()) {
        throw ApiError.conflict('Đã gửi lời mời trước đó');
      }
      // If the other person already sent request, auto-accept
      return this.acceptRequest(existingRequest._id, fromUserId);
    }

    const request = await FriendRequest.create({
      from: fromUserId,
      to: toUserId,
      message: message || 'Xin chào! Mình muốn kết bạn với bạn.',
      source,
    });

    logger.info(`Friend request sent: ${fromUserId} → ${toUserId}`);

    return request;
  }

  /**
   * Accept a friend request
   */
  async acceptRequest(requestId, userId) {
    const request = await FriendRequest.findById(requestId);
    if (!request) {
      throw ApiError.notFound('Lời mời không tồn tại');
    }

    if (request.to.toString() !== userId.toString()) {
      throw ApiError.forbidden('Không có quyền chấp nhận lời mời này');
    }

    if (request.status !== 'pending') {
      throw ApiError.badRequest('Lời mời đã được xử lý');
    }

    request.status = 'accepted';
    request.respondedAt = new Date();
    await request.save();

    // Add to each other's friend list
    await User.findByIdAndUpdate(request.from, {
      $addToSet: { friends: request.to },
      $inc: { friendCount: 1 },
    });

    await User.findByIdAndUpdate(request.to, {
      $addToSet: { friends: request.from },
      $inc: { friendCount: 1 },
    });

    // Auto-create 1-1 conversation
    let conversation = await Conversation.findOne({
      type: 'private',
      'participants.user': { $all: [request.from, request.to] },
      $expr: { $eq: [{ $size: '$participants' }, 2] },
    });

    if (!conversation) {
      conversation = await Conversation.create({
        type: 'private',
        participants: [
          { user: request.from, role: 'member' },
          { user: request.to, role: 'member' },
        ],
      });
    }

    logger.info(`Friend request accepted: ${request.from} ↔ ${request.to}`);

    return { request, conversation };
  }

  /**
   * Reject a friend request
   */
  async rejectRequest(requestId, userId) {
    const request = await FriendRequest.findById(requestId);
    if (!request) throw ApiError.notFound('Lời mời không tồn tại');
    if (request.to.toString() !== userId.toString()) {
      throw ApiError.forbidden('Không có quyền từ chối lời mời này');
    }
    if (request.status !== 'pending') {
      throw ApiError.badRequest('Lời mời đã được xử lý');
    }

    request.status = 'rejected';
    request.respondedAt = new Date();
    await request.save();

    return request;
  }

  /**
   * Cancel a sent friend request
   */
  async cancelRequest(requestId, userId) {
    const request = await FriendRequest.findById(requestId);
    if (!request) throw ApiError.notFound('Lời mời không tồn tại');
    if (request.from.toString() !== userId.toString()) {
      throw ApiError.forbidden('Không có quyền hủy lời mời này');
    }
    if (request.status !== 'pending') {
      throw ApiError.badRequest('Lời mời đã được xử lý');
    }

    request.status = 'cancelled';
    await request.save();

    return request;
  }

  /**
   * Get friends list
   */
  async getFriends(userId, search = '', page = 1, limit = 20) {
    const user = await User.findById(userId)
      .populate({
        path: 'friends',
        match: search ? { displayName: { $regex: search, $options: 'i' } } : {},
        select: 'displayName avatar bio isOnline lastSeen',
        options: {
          skip: (page - 1) * limit,
          limit,
          sort: { displayName: 1 },
        },
      });

    return {
      friends: user.friends,
      total: user.friendCount,
    };
  }

  /**
   * Get online friends
   */
  async getOnlineFriends(userId) {
    const user = await User.findById(userId)
      .populate({
        path: 'friends',
        match: { isOnline: true },
        select: 'displayName avatar customStatusText customStatusEmoji',
      });

    return user.friends;
  }

  /**
   * Get received friend requests
   */
  async getReceivedRequests(userId, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [requests, total] = await Promise.all([
      FriendRequest.find({ to: userId, status: 'pending' })
        .populate('from', 'displayName avatar bio')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      FriendRequest.countDocuments({ to: userId, status: 'pending' }),
    ]);

    return { requests, total };
  }

  /**
   * Get sent friend requests
   */
  async getSentRequests(userId, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [requests, total] = await Promise.all([
      FriendRequest.find({ from: userId, status: 'pending' })
        .populate('to', 'displayName avatar bio')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      FriendRequest.countDocuments({ from: userId, status: 'pending' }),
    ]);

    return { requests, total };
  }

  /**
   * Unfriend
   */
  async unfriend(userId, friendId) {
    await User.findByIdAndUpdate(userId, {
      $pull: { friends: friendId },
      $inc: { friendCount: -1 },
    });

    await User.findByIdAndUpdate(friendId, {
      $pull: { friends: userId },
      $inc: { friendCount: -1 },
    });

    logger.info(`Unfriended: ${userId} ↔ ${friendId}`);
  }

  /**
   * Get mutual friends
   */
  async getMutualFriends(userId, otherUserId) {
    const [user, otherUser] = await Promise.all([
      User.findById(userId).select('friends'),
      User.findById(otherUserId).select('friends'),
    ]);

    const userFriends = new Set(user.friends.map(f => f.toString()));
    const mutualIds = otherUser.friends.filter(f => userFriends.has(f.toString()));

    const mutualFriends = await User.find({ _id: { $in: mutualIds } })
      .select('displayName avatar');

    return mutualFriends;
  }

  /**
   * Get friend suggestions (mutual friends algorithm)
   */
  async getSuggestions(userId, limit = 20) {
    const user = await User.findById(userId).select('friends blockedUsers');
    const friendIds = user.friends.map(f => f.toString());
    const blockedIds = user.blockedUsers.map(b => b.toString());
    const excludeIds = [userId.toString(), ...friendIds, ...blockedIds];

    // Find friends of friends
    const suggestions = await User.aggregate([
      { $match: { _id: { $in: user.friends } } },
      { $unwind: '$friends' },
      { $match: { friends: { $nin: excludeIds.map(id => require('mongoose').Types.ObjectId.createFromHexString(id)) } } },
      { $group: { _id: '$friends', mutualCount: { $sum: 1 } } },
      { $sort: { mutualCount: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      {
        $project: {
          _id: '$user._id',
          displayName: '$user.displayName',
          avatar: '$user.avatar',
          bio: '$user.bio',
          mutualFriendCount: '$mutualCount',
        },
      },
    ]);

    return suggestions;
  }

  /**
   * Sync contacts — batch phone number lookup
   */
  async syncContacts(userId, phoneNumbers) {
    const user = await User.findById(userId).select('friends blockedUsers');

    // Sanitize all phones
    const sanitizedPhones = phoneNumbers.map(p => sanitizePhone(p)).filter(Boolean);

    const contacts = await User.find({
      phone: { $in: sanitizedPhones },
      status: 'active',
      _id: { $ne: userId },
      'settings.privacy.allowFindByPhone': true,
    }).select('displayName avatar phone');

    // Annotate with friendship status
    const friendIds = new Set(user.friends.map(f => f.toString()));
    const blockedIds = new Set(user.blockedUsers.map(b => b.toString()));

    const result = contacts.map(c => ({
      ...c.toObject(),
      isFriend: friendIds.has(c._id.toString()),
      isBlocked: blockedIds.has(c._id.toString()),
    }));

    return result;
  }
}

module.exports = new FriendService();
