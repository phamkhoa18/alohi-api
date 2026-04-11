const mongoose = require('mongoose');
const { Schema } = mongoose;

const reportSchema = new Schema({
  reporter: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  targetType: {
    type: String,
    enum: ['user', 'message', 'group', 'story', 'sticker'],
    required: true,
  },
  targetId: { type: Schema.Types.ObjectId, required: true },
  reason: {
    type: String,
    enum: ['spam', 'harassment', 'inappropriate', 'fake_account', 'violence', 'scam', 'hate_speech', 'copyright', 'other'],
    required: true,
  },
  description: { type: String, maxlength: 1000 },
  evidence: [String],
  status: {
    type: String,
    enum: ['pending', 'reviewing', 'resolved', 'dismissed'],
    default: 'pending',
  },
  resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  resolution: String,
  resolvedAt: Date,
}, { timestamps: true });

module.exports = mongoose.model('Report', reportSchema);
