const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Verify JWT access token from Authorization header
 */
const verifyToken = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    throw ApiError.unauthorized('Vui lòng đăng nhập để truy cập');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      throw ApiError.unauthorized('User không tồn tại');
    }

    if (user.status !== 'active') {
      throw ApiError.forbidden('Tài khoản đã bị khóa hoặc xóa');
    }

    req.user = user;
    req.deviceId = decoded.deviceId;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw ApiError.unauthorized('Token đã hết hạn');
    }
    if (error.name === 'JsonWebTokenError') {
      throw ApiError.unauthorized('Token không hợp lệ');
    }
    throw error;
  }
});

/**
 * Optional auth — attach user if token exists, don't throw if not
 */
const optionalAuth = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      const user = await User.findById(decoded.userId).select('-password');
      if (user && user.status === 'active') {
        req.user = user;
        req.deviceId = decoded.deviceId;
      }
    } catch (error) {
      // Silently ignore — optional auth
    }
  }

  next();
});

module.exports = { verifyToken, optionalAuth };
