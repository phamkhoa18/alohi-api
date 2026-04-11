const Joi = require('joi');

const updateProfile = {
  body: Joi.object({
    displayName: Joi.string().min(2).max(50).trim(),
    bio: Joi.string().max(200).allow(''),
    gender: Joi.string().valid('male', 'female', 'other'),
    dateOfBirth: Joi.date().max('now').allow(null),
    customStatusText: Joi.string().max(100).allow(''),
    customStatusEmoji: Joi.string().max(10).allow(''),
  }),
};

const updatePrivacy = {
  body: Joi.object({
    showPhone: Joi.boolean(),
    showDOB: Joi.boolean(),
    showLastSeen: Joi.boolean(),
    showOnlineStatus: Joi.boolean(),
    allowStrangerMessage: Joi.boolean(),
    allowStrangerCall: Joi.boolean(),
    allowFindByPhone: Joi.boolean(),
    profileVisibility: Joi.string().valid('everyone', 'friends', 'nobody'),
    readReceipts: Joi.boolean(),
  }),
};

const updateNotification = {
  body: Joi.object({
    messageSound: Joi.string().max(50),
    messageVibrate: Joi.boolean(),
    callSound: Joi.string().max(50),
    callVibrate: Joi.boolean(),
    showPreview: Joi.boolean(),
    showNotification: Joi.boolean(),
    muteUntil: Joi.date().allow(null),
  }),
};

const updateChatSettings = {
  body: Joi.object({
    fontSize: Joi.number().min(12).max(24),
    wallpaper: Joi.string().allow(null, ''),
    enterToSend: Joi.boolean(),
    mediaAutoDownload: Joi.object({
      wifi: Joi.boolean(),
      mobile: Joi.boolean(),
    }),
  }),
};

const searchUsers = {
  query: Joi.object({
    q: Joi.string().min(1).max(100).required(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20),
  }),
};

module.exports = {
  updateProfile,
  updatePrivacy,
  updateNotification,
  updateChatSettings,
  searchUsers,
};
