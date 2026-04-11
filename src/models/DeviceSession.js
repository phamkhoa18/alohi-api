const mongoose = require('mongoose');
const { Schema } = mongoose;

const deviceSessionSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  deviceId: { type: String, required: true },
  deviceName: String,
  deviceModel: String,
  platform: {
    type: String,
    enum: ['android', 'ios', 'web'],
    required: true,
  },
  osVersion: String,
  appVersion: String,
  ipAddress: String,
  location: {
    city: String,
    country: String,
  },

  // === Status ===
  isActive: { type: Boolean, default: true },
  lastActiveAt: { type: Date, default: Date.now },
  socketId: String,

  // === Push ===
  fcmToken: String,

  // === Security ===
  loginAt: { type: Date, default: Date.now },
  logoutAt: Date,
}, { timestamps: true });

deviceSessionSchema.index({ user: 1, deviceId: 1 }, { unique: true });
deviceSessionSchema.index({ user: 1, isActive: 1 });
deviceSessionSchema.index({ socketId: 1 });

module.exports = mongoose.model('DeviceSession', deviceSessionSchema);
