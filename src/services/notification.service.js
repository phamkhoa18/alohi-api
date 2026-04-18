const Notification = require('../models/Notification');
const User = require('../models/User');
const { getRedis } = require('../config/redis');
const logger = require('../utils/logger');

class NotificationService {
  /**
   * Create and send notification
   */
  async create({ recipientId, senderId, type, title, body, imageUrl, data }) {
    const notification = await Notification.create({
      recipient: recipientId,
      sender: senderId,
      type,
      title,
      body,
      imageUrl,
      data,
    });

    // Try FCM push
    await this.sendPush(recipientId, notification);

    return notification;
  }

  /**
   * Send FCM push notification
   */
  async sendPush(userId, notification) {
    try {
      // Check if user is muted globally
      const user = await User.findById(userId).select('settings.notification fcmTokens');
      if (!user) return;

      const muteUntil = user.settings?.notification?.muteUntil;
      if (muteUntil && muteUntil > new Date()) return;

      // Check if conversation is specifically muted
      if (notification.data?.conversationId) {
        const Conversation = require('../models/Conversation');
        const conv = await Conversation.findById(notification.data.conversationId);
        if (conv) {
          const participant = conv.participants.find(p => p.user && p.user.toString() === userId.toString());
          if (participant && participant.isMuted) {
            return; // Skip FCM push for muted conversation
          }
        }
      }

      // The earlier foreground check was too aggressive and blocked all push notifications 
      // (friend requests, messages from other users) when the app was merely open but 
      // on another screen. Android handles its own foreground notifications properly.

      // Get FCM tokens
      const tokens = user.fcmTokens?.map(t => t.token).filter(Boolean) || [];
      if (tokens.length === 0) return;

      // Send via Firebase Admin SDK (if configured)
      try {
        const { admin } = require('../config/firebase');
        if (admin.apps?.length > 0) {
          await admin.messaging().sendEachForMulticast({
            tokens,
            data: {
              type: notification.type,
              title: notification.title || '',
              body: notification.body || '',
              imageUrl: notification.imageUrl || '',
              ...Object.fromEntries(
                Object.entries(notification.data || {})
                  .filter(([_, v]) => v != null)
                  .map(([k, v]) => [k, String(v)])
              ),
            },
            android: { priority: 'high' },
          });

          notification.fcmSent = true;
          await notification.save();
        }
      } catch (fcmError) {
        logger.error('FCM send error:', fcmError.message);
        notification.fcmError = fcmError.message;
        await notification.save();
      }
    } catch (error) {
      logger.error('Push notification error:', error.message);
    }
  }

  /**
   * Get notifications for user
   */
  async getNotifications(userId, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find({ recipient: userId })
        .populate('sender', 'displayName avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Notification.countDocuments({ recipient: userId }),
      Notification.countDocuments({ recipient: userId, isRead: false }),
    ]);

    return { notifications, total, unreadCount };
  }

  /**
   * Mark notification as read
   */
  async markRead(notificationId, userId) {
    await Notification.findOneAndUpdate(
      { _id: notificationId, recipient: userId },
      { isRead: true, readAt: new Date() }
    );
  }

  /**
   * Mark all notifications as read
   */
  async markAllRead(userId) {
    await Notification.updateMany(
      { recipient: userId, isRead: false },
      { isRead: true, readAt: new Date() }
    );
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId, userId) {
    await Notification.findOneAndDelete({ _id: notificationId, recipient: userId });
  }

  /**
   * Clear all notifications
   */
  async clearAll(userId) {
    await Notification.deleteMany({ recipient: userId });
  }

  /**
   * Get unread count
   */
  async getUnreadCount(userId) {
    return Notification.countDocuments({ recipient: userId, isRead: false });
  }
}

module.exports = new NotificationService();
