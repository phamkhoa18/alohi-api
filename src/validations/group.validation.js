const Joi = require('joi');

const createGroup = {
  body: Joi.object({
    name: Joi.string().min(1).max(100).trim().required()
      .messages({ 'any.required': 'Tên nhóm là bắt buộc' }),
    members: Joi.array().items(Joi.string()).min(1).required()
      .messages({
        'array.min': 'Nhóm cần ít nhất 2 thành viên (bao gồm bạn)',
      }),
    description: Joi.string().max(500).allow(''),
  }),
};

const updateGroup = {
  body: Joi.object({
    name: Joi.string().min(1).max(100).trim(),
    description: Joi.string().max(500).allow(''),
  }),
};

const addMembers = {
  body: Joi.object({
    members: Joi.array().items(Joi.string()).min(1).max(50).required(),
  }),
};

const changeRole = {
  body: Joi.object({
    role: Joi.string().valid('admin', 'co-admin', 'member').required(),
  }),
};

const updateSettings = {
  body: Joi.object({
    onlyAdminCanSend: Joi.boolean(),
    onlyAdminCanAddMember: Joi.boolean(),
    onlyAdminCanChangeInfo: Joi.boolean(),
    onlyAdminCanPin: Joi.boolean(),
    approvalRequired: Joi.boolean(),
    maxMembers: Joi.number().min(3).max(1000),
    slowMode: Joi.number().min(0).max(3600),
  }),
};

module.exports = {
  createGroup,
  updateGroup,
  addMembers,
  changeRole,
  updateSettings,
};
