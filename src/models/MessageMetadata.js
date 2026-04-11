const mongoose = require('mongoose');
const { Schema } = mongoose;

const messageMetadataSchema = new Schema({
  messageId: { type: String, required: true, unique: true },
  conversation: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
  sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  type: String,
  preview: { type: String, maxlength: 100 },
  isRecalled: { type: Boolean, default: false },
  recalledAt: Date,

  // === Reactions ===
  reactions: [{
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    emoji: String,
    createdAt: { type: Date, default: Date.now },
  }],

  // === Delivery tracking ===
  deliveredTo: [{
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    deliveredAt: Date,
  }],
  readBy: [{
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    readAt: Date,
  }],

  // === Deletion ===
  deletedFor: [{ type: Schema.Types.ObjectId, ref: 'User' }],

  createdAt: { type: Date, default: Date.now },
});

messageMetadataSchema.index({ conversation: 1, createdAt: -1 });
messageMetadataSchema.index({ sender: 1, createdAt: -1 });

module.exports = mongoose.model('MessageMetadata', messageMetadataSchema);
