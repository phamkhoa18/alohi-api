const mongoose = require('mongoose');
const { Schema } = mongoose;

const callLogSchema = new Schema({
  callId: { type: String, required: true, unique: true },
  conversation: { type: Schema.Types.ObjectId, ref: 'Conversation' },

  caller: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  receiver: { type: Schema.Types.ObjectId, ref: 'User', required: true },

  type: { type: String, enum: ['voice', 'video', 'audio'], required: true },

  status: {
    type: String,
    enum: ['ringing', 'answered', 'rejected', 'missed', 'cancelled', 'busy', 'failed', 'no_answer'],
    default: 'ringing',
  },

  startedAt: Date,
  answeredAt: Date,
  endedAt: Date,
  duration: { type: Number, default: 0 },

  endReason: {
    type: String,
    enum: ['normal', 'timeout', 'error', 'caller_cancel', 'receiver_reject', 'busy'],
  },

  // === Group call ===
  isGroupCall: { type: Boolean, default: false },
  participants: [{
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    joinedAt: Date,
    leftAt: Date,
    duration: Number,
    status: { type: String, enum: ['joined', 'left', 'missed', 'rejected'] },
  }],

  // === Quality ===
  quality: {
    networkType: String,
    codec: String,
    avgBitrate: Number,
    maxBitrate: Number,
    packetLoss: Number,
    jitter: Number,
    roundTripTime: Number,
  },

  // === Deletion ===
  deletedFor: [{ type: Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

callLogSchema.index({ caller: 1, createdAt: -1 });
callLogSchema.index({ receiver: 1, createdAt: -1 });

module.exports = mongoose.model('CallLog', callLogSchema);
