const mongoose = require('mongoose');
const { Schema } = mongoose;

const messageQueueSchema = new Schema({
  messageId: {
    type: String,
    required: true,
    unique: true,
  },
  clientMessageId: String,

  // === Routing ===
  conversation: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
  sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true },

  // === Content (tạm giữ cho đến khi deliver) ===
  type: {
    type: String,
    enum: ['text', 'image', 'video', 'audio', 'file', 'sticker', 'gif', 'location', 'contact', 'system', 'call'],
    required: true,
  },
  encryptedContent: String,
  content: String,

  attachments: [{
    fileName: String,
    fileSize: Number,
    fileType: String,
    url: String,
    thumbnailUrl: String,
    duration: Number,
    dimensions: { width: Number, height: Number },
    encryptionKey: String,
  }],

  sticker: {
    packId: String,
    stickerId: String,
    url: String,
  },

  location: {
    latitude: Number,
    longitude: Number,
    address: String,
    name: String,
  },

  sharedContact: {
    name: String,
    phone: String,
    avatar: String,
  },

  replyTo: {
    messageId: String,
    senderName: String,
    preview: String,
    type: String,
  },

  forwardedFrom: {
    messageId: String,
    conversationId: Schema.Types.ObjectId,
  },

  mentions: [{
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    offset: Number,
    length: Number,
  }],

  systemEvent: {
    type: String,
    targetUser: Schema.Types.ObjectId,
    metadata: Schema.Types.Mixed,
  },

  // === Delivery Status ===
  status: {
    type: String,
    enum: ['queued', 'delivering', 'delivered', 'failed', 'expired'],
    default: 'queued',
  },
  attempts: { type: Number, default: 0 },
  maxAttempts: { type: Number, default: 3 },
  lastAttemptAt: Date,
  deliveredAt: Date,
  failReason: String,

  // === TTL ===
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    index: { expireAfterSeconds: 0 },
  },

  createdAt: { type: Date, default: Date.now },
});

// === Indexes ===
messageQueueSchema.index({ recipient: 1, status: 1, createdAt: 1 });
messageQueueSchema.index({ conversation: 1, createdAt: 1 });
messageQueueSchema.index({ sender: 1 });
messageQueueSchema.index({ clientMessageId: 1 });

module.exports = mongoose.model('MessageQueue', messageQueueSchema);
