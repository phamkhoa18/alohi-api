const mongoose = require('mongoose');
const { Schema } = mongoose;

const conversationSchema = new Schema({
  type: {
    type: String,
    enum: ['private', 'group'],
    required: true,
  },

  // === Participants ===
  participants: [{
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: {
      type: String,
      enum: ['owner', 'admin', 'co-admin', 'member'],
      default: 'member',
    },
    nickname: String,
    joinedAt: { type: Date, default: Date.now },
    addedBy: { type: Schema.Types.ObjectId, ref: 'User' },

    // === Per-user conversation settings ===
    isMuted: { type: Boolean, default: false },
    mutedUntil: Date,
    isPinned: { type: Boolean, default: false },
    isHidden: { type: Boolean, default: false },
    isArchived: { type: Boolean, default: false },
    customWallpaper: String,
    customNotificationSound: String,

    // === Sync markers ===
    lastReadMessageId: { type: Schema.Types.ObjectId },
    lastReadAt: { type: Date, default: Date.now },
    lastDeliveredMessageId: { type: Schema.Types.ObjectId },
    unreadCount: { type: Number, default: 0 },

    // === Deletion ===
    deletedAt: Date,
    clearHistoryAt: Date,
  }],

  // === Last message preview (cho conversation list) ===
  lastMessage: {
    _id: Schema.Types.ObjectId,
    sender: { type: Schema.Types.ObjectId, ref: 'User' },
    type: String,
    preview: String,
    timestamp: Date,
    isRecalled: { type: Boolean, default: false },
  },

  // === Group info (only when type = 'group') ===
  group: {
    name: { type: String, maxlength: 100 },
    avatar: {
      url: String,
      publicId: String,
    },
    description: { type: String, maxlength: 500 },
    inviteLink: { type: String, unique: true, sparse: true },
    inviteLinkEnabled: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },

    settings: {
      onlyAdminCanSend: { type: Boolean, default: false },
      onlyAdminCanAddMember: { type: Boolean, default: false },
      onlyAdminCanChangeInfo: { type: Boolean, default: true },
      onlyAdminCanPin: { type: Boolean, default: true },
      approvalRequired: { type: Boolean, default: false },
      maxMembers: { type: Number, default: 500 },
      slowMode: { type: Number, default: 0 },
    },

    pendingRequests: [{
      user: { type: Schema.Types.ObjectId, ref: 'User' },
      requestedAt: { type: Date, default: Date.now },
      message: String,
    }],
  },

  // === Pinned messages ===
  pinnedMessages: [{
    messageId: Schema.Types.ObjectId,
    pinnedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    pinnedAt: { type: Date, default: Date.now },
    preview: String,
  }],

  // === Metadata ===
  totalMessages: { type: Number, default: 0 },
  totalMedia: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
}, {
  timestamps: true,
});

// === Indexes ===
conversationSchema.index({ 'participants.user': 1, updatedAt: -1 });
conversationSchema.index({ type: 1 });
conversationSchema.index({ 'participants.user': 1, 'participants.isPinned': 1 });
conversationSchema.index({ 'participants.user': 1, 'participants.isArchived': 1 });

// === Methods ===
conversationSchema.methods.getParticipant = function (userId) {
  return this.participants.find(p => p.user.toString() === userId.toString());
};

conversationSchema.methods.isParticipant = function (userId) {
  return this.participants.some(p =>
    p.user.toString() === userId.toString() && !p.deletedAt
  );
};

conversationSchema.methods.isAdmin = function (userId) {
  const participant = this.getParticipant(userId);
  return participant && ['owner', 'admin', 'co-admin'].includes(participant.role);
};

conversationSchema.methods.isOwner = function (userId) {
  const participant = this.getParticipant(userId);
  return participant && participant.role === 'owner';
};

module.exports = mongoose.model('Conversation', conversationSchema);
