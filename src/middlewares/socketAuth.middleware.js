const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

/**
 * Socket.IO JWT authentication middleware
 */
const socketAuth = async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    const deviceId = socket.handshake.auth?.deviceId;

    if (!token) {
      return next(new Error('Authentication required'));
    }

    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    const user = await User.findById(decoded.userId).select('-password');

    if (!user || user.status !== 'active') {
      return next(new Error('User not found or inactive'));
    }

    // Attach user info to socket
    socket.userId = user._id.toString();
    socket.user = user;
    socket.deviceId = deviceId || decoded.deviceId;
    socket.platform = socket.handshake.auth?.platform || 'unknown';
    socket.appVersion = socket.handshake.auth?.appVersion || 'unknown';

    next();
  } catch (error) {
    logger.error('Socket auth error:', error.message);
    if (error.name === 'TokenExpiredError') {
      return next(new Error('Token expired'));
    }
    return next(new Error('Authentication failed'));
  }
};

module.exports = { socketAuth };
