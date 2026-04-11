const mongoose = require('mongoose');
const { Schema } = mongoose;

const storySchema = new Schema({
  author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  type: {
    type: String,
    enum: ['image', 'video', 'text'],
    required: true,
  },

  content: {
    text: String,
    backgroundColor: String,
    fontFamily: String,
    textColor: String,
  },
  media: {
    url: String,
    publicId: String,
    thumbnailUrl: String,
    duration: Number,
    dimensions: { width: Number, height: Number },
  },
  caption: { type: String, maxlength: 500 },
  location: { name: String, latitude: Number, longitude: Number },
  music: {
    name: String,
    artist: String,
    url: String,
    startTime: Number,
    duration: Number,
  },

  // === Privacy ===
  privacy: {
    type: String,
    enum: ['public', 'friends', 'close_friends', 'custom', 'only_me'],
    default: 'friends',
  },
  allowedUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  excludedUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }],

  // === Interactions ===
  viewers: [{
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    viewedAt: { type: Date, default: Date.now },
    reaction: String,
  }],
  viewCount: { type: Number, default: 0 },

  replies: [{
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    content: String,
    type: { type: String, enum: ['text', 'image', 'emoji'], default: 'text' },
    createdAt: { type: Date, default: Date.now },
  }],

  // === TTL ===
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
    index: { expireAfterSeconds: 0 },
  },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

storySchema.index({ author: 1, createdAt: -1 });
storySchema.index({ privacy: 1 });

module.exports = mongoose.model('Story', storySchema);
