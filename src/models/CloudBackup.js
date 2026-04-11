const mongoose = require('mongoose');
const { Schema } = mongoose;

const cloudBackupSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },

  backupId: { type: String, required: true, unique: true },
  type: {
    type: String,
    enum: ['full', 'incremental'],
    required: true,
  },
  status: {
    type: String,
    enum: ['in_progress', 'completed', 'failed', 'expired'],
    default: 'in_progress',
  },

  // === Content ===
  includesMedia: { type: Boolean, default: false },
  conversationCount: Number,
  messageCount: Number,
  mediaCount: Number,

  // === Storage ===
  encryptedFileUrl: String,
  encryptionSalt: String,
  encryptionIv: String,
  fileSize: Number,
  checksum: String,

  // === Incremental ===
  basedOnBackup: { type: Schema.Types.ObjectId, ref: 'CloudBackup' },
  fromTimestamp: Date,
  toTimestamp: Date,

  // === Metadata ===
  deviceName: String,
  appVersion: String,
  completedAt: Date,
  error: String,

  expiresAt: Date,
}, { timestamps: true });

cloudBackupSchema.index({ user: 1, createdAt: -1 });
cloudBackupSchema.index({ user: 1, status: 1 });

module.exports = mongoose.model('CloudBackup', cloudBackupSchema);
