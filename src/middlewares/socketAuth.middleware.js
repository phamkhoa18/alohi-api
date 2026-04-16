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

    // Ignore expiration setting allows the socket to stay connected or reconnect 
    // even if the token timed out, since the REST API handles token refreshing separately.
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET, { ignoreExpiration: true });
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
    const tokenSnippet = socket.handshake.auth?.token?.substring(0, 15) || 'NO_TOKEN';
    logger.error(`Socket auth error: ${error.message} (token: ${tokenSnippet}...)`);
    if (error.name === 'TokenExpiredError') {
      return next(new Error('Token expired'));
    }
    return next(new Error('Authentication failed'));
  }
};

module.exports = { socketAuth };
