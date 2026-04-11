const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { Schema } = mongoose;

const userSchema = new Schema({
  // === Identity ===
  phone: {
    type: String,
    required: [true, 'Số điện thoại là bắt buộc'],
    unique: true,
    match: [/^(\+84|0)[0-9]{9,10}$/, 'Số điện thoại không hợp lệ'],
  },
  password: {
    type: String,
    required: [true, 'Mật khẩu là bắt buộc'],
    minlength: [6, 'Mật khẩu phải có ít nhất 6 ký tự'],
    select: false,
  },
  displayName: {
    type: String,
    required: [true, 'Tên hiển thị là bắt buộc'],
    trim: true,
    minlength: [2, 'Tên hiển thị phải có ít nhất 2 ký tự'],
    maxlength: [50, 'Tên hiển thị tối đa 50 ký tự'],
  },

  // === Profile ===
  avatar: {
    url: { type: String, default: null },
    publicId: String,
    thumbnailUrl: String,
  },
  coverPhoto: {
    url: { type: String, default: null },
    publicId: String,
  },
  bio: { type: String, maxlength: 200, default: '' },
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
    default: 'other',
  },
  dateOfBirth: Date,
  qrCode: String,
  customStatusText: { type: String, maxlength: 100, default: '' },
  customStatusEmoji: { type: String, default: '' },

  // === Privacy Settings ===
  settings: {
    privacy: {
      showPhone: { type: Boolean, default: false },
      showDOB: { type: Boolean, default: true },
      showLastSeen: { type: Boolean, default: true },
      showOnlineStatus: { type: Boolean, default: true },
      allowStrangerMessage: { type: Boolean, default: false },
      allowStrangerCall: { type: Boolean, default: false },
      allowFindByPhone: { type: Boolean, default: true },
      profileVisibility: {
        type: String,
        enum: ['everyone', 'friends', 'nobody'],
        default: 'everyone',
      },
      readReceipts: { type: Boolean, default: true },
    },
    notification: {
      messageSound: { type: String, default: 'default' },
      messageVibrate: { type: Boolean, default: true },
      callSound: { type: String, default: 'default' },
      callVibrate: { type: Boolean, default: true },
      showPreview: { type: Boolean, default: true },
      showNotification: { type: Boolean, default: true },
      muteUntil: { type: Date, default: null },
    },
    chat: {
      fontSize: { type: Number, default: 16, min: 12, max: 24 },
      wallpaper: { type: String, default: null },
      enterToSend: { type: Boolean, default: true },
      mediaAutoDownload: {
        wifi: { type: Boolean, default: true },
        mobile: { type: Boolean, default: false },
      },
    },
    backup: {
      enabled: { type: Boolean, default: false },
      frequency: {
        type: String,
        enum: ['daily', 'weekly', 'monthly', 'manual'],
        default: 'manual',
      },
      includeMedia: { type: Boolean, default: false },
      lastBackupAt: Date,
      lastBackupSize: Number,
    },
  },

  // === Social ===
  friends: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  blockedUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  friendCount: { type: Number, default: 0 },

  // === Device & Auth ===
  fcmTokens: [{
    token: String,
    deviceId: String,
    platform: { type: String, enum: ['android', 'ios', 'web'] },
    lastUsed: Date,
  }],
  refreshTokens: [{
    token: String,
    deviceId: String,
    expiresAt: Date,
    createdAt: { type: Date, default: Date.now },
  }],

  // === Encryption ===
  publicKey: String,
  keyBundleId: { type: Schema.Types.ObjectId, ref: 'KeyBundle' },

  // === Status ===
  isOnline: { type: Boolean, default: false },
  lastSeen: { type: Date, default: Date.now },
  isVerified: { type: Boolean, default: false },
  status: {
    type: String,
    enum: ['active', 'suspended', 'deleted', 'deactivated'],
    default: 'active',
  },
  deletedAt: Date,
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// === Indexes ===
userSchema.index({ displayName: 'text' });
userSchema.index({ isOnline: 1 });
userSchema.index({ friends: 1 });
userSchema.index({ status: 1 });
userSchema.index({ 'fcmTokens.deviceId': 1 });

// === Pre-save: hash password ===
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// === Methods ===
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toPublicProfile = function () {
  return {
    _id: this._id,
    displayName: this.displayName,
    avatar: this.avatar,
    bio: this.bio,
    gender: this.gender,
    customStatusText: this.customStatusText,
    customStatusEmoji: this.customStatusEmoji,
    isOnline: this.isOnline,
    lastSeen: this.lastSeen,
  };
};

userSchema.methods.toPrivateProfile = function () {
  return {
    _id: this._id,
    phone: this.phone,
    displayName: this.displayName,
    avatar: this.avatar,
    coverPhoto: this.coverPhoto,
    bio: this.bio,
    gender: this.gender,
    dateOfBirth: this.dateOfBirth,
    customStatusText: this.customStatusText,
    customStatusEmoji: this.customStatusEmoji,
    settings: this.settings,
    friendCount: this.friendCount,
    isVerified: this.isVerified,
    isOnline: this.isOnline,
    lastSeen: this.lastSeen,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model('User', userSchema);
