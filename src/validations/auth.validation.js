const Joi = require('joi');

const phoneRegex = /^(\+84|0)[0-9]{9,10}$/;

const sendOtp = {
  body: Joi.object({
    phone: Joi.string().pattern(phoneRegex).required()
      .messages({
        'string.pattern.base': 'Số điện thoại phải bắt đầu bằng +84 hoặc 0, theo sau 9-10 chữ số',
        'any.required': 'Số điện thoại là bắt buộc',
      }),
  }),
};

const verifyOtp = {
  body: Joi.object({
    phone: Joi.string().pattern(phoneRegex).required(),
    code: Joi.string().length(6).pattern(/^\d+$/).required()
      .messages({
        'string.length': 'Mã OTP phải có 6 chữ số',
        'string.pattern.base': 'Mã OTP chỉ chứa chữ số',
      }),
  }),
};

const register = {
  body: Joi.object({
    phone: Joi.string().pattern(phoneRegex).required(),
    password: Joi.string().min(6).max(128).required()
      .messages({
        'string.min': 'Mật khẩu phải có ít nhất 6 ký tự',
        'string.max': 'Mật khẩu tối đa 128 ký tự',
      }),
    displayName: Joi.string().min(2).max(50).trim().required()
      .messages({
        'string.min': 'Tên hiển thị phải có ít nhất 2 ký tự',
        'string.max': 'Tên hiển thị tối đa 50 ký tự',
      }),
    gender: Joi.string().valid('male', 'female', 'other').default('other'),
    dateOfBirth: Joi.date().max('now').allow(null),
    otpCode: Joi.string().length(6).pattern(/^\d+$/),
  }),
};

const login = {
  body: Joi.object({
    phone: Joi.string().pattern(phoneRegex).required(),
    password: Joi.string().required()
      .messages({ 'any.required': 'Mật khẩu là bắt buộc' }),
    deviceId: Joi.string().required(),
    deviceName: Joi.string().max(100),
    deviceModel: Joi.string().max(100),
    platform: Joi.string().valid('android', 'ios', 'web').required(),
    osVersion: Joi.string().max(50),
    appVersion: Joi.string().max(20),
    fcmToken: Joi.string(),
  }),
};

const refreshToken = {
  body: Joi.object({
    refreshToken: Joi.string().required(),
  }),
};

const forgotPassword = {
  body: Joi.object({
    phone: Joi.string().pattern(phoneRegex).required(),
  }),
};

const resetPassword = {
  body: Joi.object({
    phone: Joi.string().pattern(phoneRegex).required(),
    otpCode: Joi.string().length(6).pattern(/^\d+$/).required(),
    newPassword: Joi.string().min(6).max(128).required(),
  }),
};

const changePassword = {
  body: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(6).max(128).required(),
  }),
};

module.exports = {
  sendOtp,
  verifyOtp,
  register,
  login,
  refreshToken,
  forgotPassword,
  resetPassword,
  changePassword,
};
