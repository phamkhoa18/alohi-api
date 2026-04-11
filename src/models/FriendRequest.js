const mongoose = require('mongoose');
const { Schema } = mongoose;

const friendRequestSchema = new Schema({
  from: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  to: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  message: {
    type: String,
    maxlength: 200,
    default: 'Xin chào! Mình muốn kết bạn với bạn.',
  },
  source: {
    type: String,
    enum: ['search', 'phone', 'qrcode', 'group', 'suggestion', 'contact_sync'],
    default: 'search',
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'cancelled', 'blocked'],
    default: 'pending',
  },
  respondedAt: Date,
}, { timestamps: true });

friendRequestSchema.index({ from: 1, to: 1 }, { unique: true });
friendRequestSchema.index({ to: 1, status: 1, createdAt: -1 });
friendRequestSchema.index({ from: 1, status: 1 });

module.exports = mongoose.model('FriendRequest', friendRequestSchema);
