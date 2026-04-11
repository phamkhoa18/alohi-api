const Joi = require('joi');

const createStory = {
  body: Joi.object({
    type: Joi.string().valid('image', 'video', 'text').required(),
    text: Joi.string().max(500),
    backgroundColor: Joi.string(),
    fontFamily: Joi.string(),
    textColor: Joi.string(),
    caption: Joi.string().max(500),
    privacy: Joi.string().valid('public', 'friends', 'close_friends', 'custom', 'only_me').default('friends'),
    allowedUsers: Joi.array().items(Joi.string()),
    excludedUsers: Joi.array().items(Joi.string()),
  }),
};

const replyStory = {
  body: Joi.object({
    content: Joi.string().max(500).required(),
    type: Joi.string().valid('text', 'image', 'emoji').default('text'),
  }),
};

module.exports = {
  createStory,
  replyStory,
};
