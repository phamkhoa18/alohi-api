const mongoose = require('mongoose');
const { Schema } = mongoose;

const keyBundleSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  deviceId: { type: String, required: true },

  // === Identity Key (long-term) ===
  identityPublicKey: { type: String, required: true },

  // === Signed Pre-Key (rotated periodically) ===
  signedPreKey: {
    keyId: Number,
    publicKey: String,
    signature: String,
    createdAt: { type: Date, default: Date.now },
  },

  // === One-Time Pre-Keys (consumed per session) ===
  oneTimePreKeys: [{
    keyId: Number,
    publicKey: String,
    isUsed: { type: Boolean, default: false },
    usedBy: Schema.Types.ObjectId,
    usedAt: Date,
  }],

  isActive: { type: Boolean, default: true },
}, { timestamps: true });

keyBundleSchema.index({ user: 1, deviceId: 1 }, { unique: true });
keyBundleSchema.index({ 'oneTimePreKeys.isUsed': 1 });

module.exports = mongoose.model('KeyBundle', keyBundleSchema);
