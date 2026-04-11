const mongoose = require('mongoose');
const { Schema } = mongoose;

const stickerPackSchema = new Schema({
  name: { type: String, required: true },
  nameVi: String,
  description: String,
  thumbnail: String,
  author: String,
  category: {
    type: String,
    enum: ['emoji', 'character', 'cute', 'funny', 'love', 'seasonal', 'custom'],
  },
  isAnimated: { type: Boolean, default: false },
  isPremium: { type: Boolean, default: false },
  isDefault: { type: Boolean, default: false },

  stickers: [{
    stickerId: { type: String, required: true },
    url: String,
    thumbnailUrl: String,
    emoji: String,
    keywords: [String],
    width: Number,
    height: Number,
  }],

  downloadCount: { type: Number, default: 0 },
  order: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('StickerPack', stickerPackSchema);
