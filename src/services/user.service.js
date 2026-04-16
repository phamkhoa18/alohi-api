const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { sanitizePhone } = require('../utils/helpers');
const logger = require('../utils/logger');

class UserService {
  /**
   * Get user profile by ID
   */
  async getUserById(userId, requesterId = null) {
    const user = await User.findById(userId);
    if (!user || user.status !== 'active') {
      throw ApiError.notFound('User không tồn tại');
    }

    // If viewing self → full profile
    if (requesterId && requesterId.toString() === userId.toString()) {
      return user.toPrivateProfile();
    }

    // Check privacy settings
    const profile = user.toPublicProfile();

    if (requesterId) {
      const isFriend = user.friends.some(f => f.toString() === requesterId.toString());
      const visibility = user.settings?.privacy?.profileVisibility || 'everyone';

      if (visibility === 'nobody') {
        return { _id: user._id, displayName: user.displayName, avatar: user.avatar };
      }
      if (visibility === 'friends' && !isFriend) {
        return { _id: user._id, displayName: user.displayName, avatar: user.avatar };
      }

      // Add phone if allowed
      if (user.settings?.privacy?.showPhone && isFriend) {
        profile.phone = user.phone;
      }

      // Hide last seen if setting is off
      if (!user.settings?.privacy?.showLastSeen) {
        delete profile.lastSeen;
      }
      if (!user.settings?.privacy?.showOnlineStatus) {
        delete profile.isOnline;
      }

      profile.isFriend = isFriend;
      if (isFriend) {
        profile.friendStatus = 'friend';
      } else {
        const FriendRequest = require('../models/FriendRequest');
        const reqSent = await FriendRequest.findOne({ from: requesterId, to: userId, status: 'pending' });
        if (reqSent) {
          profile.friendStatus = 'sent';
        } else {
          const reqReceived = await FriendRequest.findOne({ from: userId, to: requesterId, status: 'pending' });
          if (reqReceived) {
            profile.friendStatus = 'received';
          } else {
            profile.friendStatus = 'none';
          }
        }
      }
    }

    return profile;
  }

  /**
   * Update user profile
   */
  async updateProfile(userId, updates) {
    const allowedFields = ['displayName', 'bio', 'gender', 'dateOfBirth', 'customStatusText', 'customStatusEmoji'];
    const filteredUpdates = {};
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        filteredUpdates[field] = updates[field];
      }
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: filteredUpdates },
      { new: true, runValidators: true }
    );

    if (!user) {
      throw ApiError.notFound('User không tồn tại');
    }

    return user.toPrivateProfile();
  }

  /**
   * Update avatar
   */
  async updateAvatar(userId, avatarData) {
    const user = await User.findByIdAndUpdate(
      userId,
      { $set: { avatar: avatarData } },
      { new: true }
    );
    return user.toPrivateProfile();
  }

  /**
   * Delete avatar
   */
  async deleteAvatar(userId) {
    const user = await User.findByIdAndUpdate(
      userId,
      { $set: { avatar: { url: null, publicId: null, thumbnailUrl: null } } },
      { new: true }
    );
    return user.toPrivateProfile();
  }

  /**
   * Update cover photo
   */
  async updateCoverPhoto(userId, coverData) {
    const user = await User.findByIdAndUpdate(
      userId,
      { $set: { coverPhoto: coverData } },
      { new: true }
    );
    return user.toPrivateProfile();
  }

  /**
   * Update privacy settings
   */
  async updatePrivacy(userId, privacySettings) {
    const updates = {};
    for (const [key, value] of Object.entries(privacySettings)) {
      updates[`settings.privacy.${key}`] = value;
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true }
    );
    return user.toPrivateProfile();
  }

  /**
   * Update notification settings
   */
  async updateNotificationSettings(userId, notifSettings) {
    const updates = {};
    for (const [key, value] of Object.entries(notifSettings)) {
      updates[`settings.notification.${key}`] = value;
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true }
    );
    return user.toPrivateProfile();
  }

  /**
   * Update chat settings
   */
  async updateChatSettings(userId, chatSettings) {
    const updates = {};
    for (const [key, value] of Object.entries(chatSettings)) {
      if (key === 'mediaAutoDownload') {
        for (const [subKey, subValue] of Object.entries(value)) {
          updates[`settings.chat.mediaAutoDownload.${subKey}`] = subValue;
        }
      } else {
        updates[`settings.chat.${key}`] = value;
      }
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true }
    );
    return user.toPrivateProfile();
  }

  /**
   * Search users by name or phone
   */
  async searchUsers(query, requesterId, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const sanitizedPhone = sanitizePhone(query);

    const searchQuery = {
      _id: { $ne: requesterId },
      status: 'active',
      $or: [
        { displayName: { $regex: query, $options: 'i' } },
      ],
    };

    // If looks like a phone number
    if (sanitizedPhone && /^(\+84|0)[0-9]{9,10}$/.test(sanitizedPhone)) {
      searchQuery.$or.push({ phone: sanitizedPhone });
      // Only allow find by phone if setting allows
      searchQuery.$or[searchQuery.$or.length - 1] = {
        phone: sanitizedPhone,
        'settings.privacy.allowFindByPhone': true,
      };
    }

    const [users, total] = await Promise.all([
      User.find(searchQuery)
        .select('displayName avatar bio isOnline lastSeen')
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(searchQuery),
    ]);

    return {
      users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Find user by phone number
   */
  async findByPhone(phone, requesterId) {
    phone = sanitizePhone(phone);

    const user = await User.findOne({
      phone,
      status: 'active',
      'settings.privacy.allowFindByPhone': true,
    });

    if (!user) {
      throw ApiError.notFound('Không tìm thấy user với số điện thoại này');
    }

    return this.getUserById(user._id, requesterId);
  }

  /**
   * Block user
   */
  async blockUser(userId, targetUserId) {
    if (userId.toString() === targetUserId.toString()) {
      throw ApiError.badRequest('Không thể block chính mình');
    }

    const user = await User.findById(userId);
    if (user.blockedUsers.includes(targetUserId)) {
      throw ApiError.conflict('User đã bị block');
    }

    // Add to blocked list
    user.blockedUsers.push(targetUserId);
    // Remove from friends if exists
    user.friends = user.friends.filter(f => f.toString() !== targetUserId.toString());
    user.friendCount = user.friends.length;
    await user.save();

    // Remove from target's friend list too
    await User.findByIdAndUpdate(targetUserId, {
      $pull: { friends: userId },
      $inc: { friendCount: -1 },
    });

    logger.info(`User ${userId} blocked ${targetUserId}`);
  }

  /**
   * Unblock user
   */
  async unblockUser(userId, targetUserId) {
    await User.findByIdAndUpdate(userId, {
      $pull: { blockedUsers: targetUserId },
    });
    logger.info(`User ${userId} unblocked ${targetUserId}`);
  }

  /**
   * Get blocked users list
   */
  async getBlockedUsers(userId) {
    const user = await User.findById(userId)
      .populate('blockedUsers', 'displayName avatar');
    return user.blockedUsers;
  }
}

module.exports = new UserService();
