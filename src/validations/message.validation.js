const Joi = require('joi');

const sendMessage = {
  body: Joi.object({
    clientMessageId: Joi.string().required(),
    type: Joi.string()
      .valid('text', 'image', 'video', 'audio', 'file', 'sticker', 'gif', 'location', 'contact', 'system')
      .required(),
    content: Joi.string().max(5000).allow('', null),
    encryptedContent: Joi.string().allow(null),
    attachments: Joi.array().items(Joi.object({
      fileName: Joi.string(),
      fileSize: Joi.number(),
      fileType: Joi.string(),
      url: Joi.string().uri(),
      thumbnailUrl: Joi.string().uri().allow(null),
      duration: Joi.number().allow(null),
      dimensions: Joi.object({
        width: Joi.number(),
        height: Joi.number(),
      }).allow(null),
    })),
    replyTo: Joi.object({
      messageId: Joi.string(),
      senderName: Joi.string(),
      preview: Joi.string().max(200),
      type: Joi.string(),
    }).allow(null),
    mentions: Joi.array().items(Joi.object({
      userId: Joi.string(),
      offset: Joi.number(),
      length: Joi.number(),
    })),
    sticker: Joi.object({
      packId: Joi.string(),
      stickerId: Joi.string(),
      url: Joi.string().uri(),
    }).allow(null),
    location: Joi.object({
      latitude: Joi.number().min(-90).max(90),
      longitude: Joi.number().min(-180).max(180),
      address: Joi.string().max(500),
      name: Joi.string().max(200),
    }).allow(null),
    sharedContact: Joi.object({
      name: Joi.string(),
      phone: Joi.string(),
      avatar: Joi.string().allow(null),
    }).allow(null),
  }),
};

const forwardMessage = {
  body: Joi.object({
    targetConversationIds: Joi.array().items(Joi.string()).min(1).max(10).required(),
  }),
};

const reactMessage = {
  body: Joi.object({
    emoji: Joi.string().max(10).required(),
  }),
};

module.exports = {
  sendMessage,
  forwardMessage,
  reactMessage,
};
