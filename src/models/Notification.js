const mongoose = require('mongoose');
const { Schema } = mongoose;

const notificationSchema = new Schema({
  recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  sender: { type: Schema.Types.ObjectId, ref: 'User' },

  type: {
    type: String,
    enum: [
      'friend_request', 'friend_accepted', 'friend_rejected',
      'new_message', 'missed_call',
      'group_invite', 'group_member_added', 'group_member_removed',
      'group_role_changed', 'group_join_request',
      'story_reaction', 'story_reply', 'story_mention',
      'mention_in_chat',
      'system_update', 'security_alert',
    ],
    required: true,
  },

  title: { type: String, required: true },
  body: { type: String, required: true },
  imageUrl: String,

  data: {
    conversationId: Schema.Types.ObjectId,
    messageId: String,
    storyId: Schema.Types.ObjectId,
    callId: String,
    userId: Schema.Types.ObjectId,
    friendRequestId: Schema.Types.ObjectId,
    actionUrl: String,
  },

  // === Status ===
  isRead: { type: Boolean, default: false },
  readAt: Date,
  isClicked: { type: Boolean, default: false },
  clickedAt: Date,

  // === Push ===
  fcmSent: { type: Boolean, default: false },
  fcmError: String,

  // === Grouping ===
  groupKey: String,
  count: { type: Number, default: 1 },
}, { timestamps: true });

notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ recipient: 1, type: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
