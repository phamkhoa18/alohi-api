const jwt = require('jsonwebtoken');
const User = require('../models/User');
const DeviceSession = require('../models/DeviceSession');
const ApiError = require('../utils/ApiError');
const { hashToken, sanitizePhone } = require('../utils/helpers');
const { getRedis } = require('../config/redis');
const logger = require('../utils/logger');

class AuthService {
  /**
   * Register a new user
   */
  async register({ phone, password, displayName, gender, dateOfBirth }) {
    phone = sanitizePhone(phone);

    // Check if phone already exists
    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      throw ApiError.conflict('Số điện thoại đã được đăng ký');
    }

    const user = await User.create({
      phone,
      password,
      displayName,
      gender: gender || 'other',
      dateOfBirth,
    });

    logger.info(`New user registered: ${user._id} (${phone})`);

    return user;
  }

  /**
   * Login user and generate tokens
   */
  async login({ phone, password, deviceId, deviceName, deviceModel, platform, osVersion, appVersion, fcmToken }) {
    phone = sanitizePhone(phone);

    // Find user with password
    const user = await User.findOne({ phone, status: 'active' }).select('+password');
    if (!user) {
      throw ApiError.unauthorized('Số điện thoại hoặc mật khẩu không đúng');
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw ApiError.unauthorized('Số điện thoại hoặc mật khẩu không đúng');
    }

    // Generate tokens
    const { accessToken, refreshToken } = this.generateTokens(user._id, deviceId);

    // Save refresh token
    user.refreshTokens = user.refreshTokens || [];
    // Remove old token for same device
    user.refreshTokens = user.refreshTokens.filter(rt => rt.deviceId !== deviceId);
    user.refreshTokens.push({
      token: hashToken(refreshToken),
      deviceId,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30d
    });

    // Update FCM token
    if (fcmToken) {
      user.fcmTokens = user.fcmTokens || [];
      user.fcmTokens = user.fcmTokens.filter(t => t.deviceId !== deviceId);
      user.fcmTokens.push({
        token: fcmToken,
        deviceId,
        platform,
        lastUsed: new Date(),
      });
    }

    await user.save();

    // Upsert device session
    await DeviceSession.findOneAndUpdate(
      { user: user._id, deviceId },
      {
        user: user._id,
        deviceId,
        deviceName,
        deviceModel,
        platform,
        osVersion,
        appVersion,
        isActive: true,
        loginAt: new Date(),
        lastActiveAt: new Date(),
        fcmToken,
      },
      { upsert: true, new: true }
    );

    // Remove password from response
    user.password = undefined;

    logger.info(`User logged in: ${user._id} from device ${deviceId}`);

    return {
      user: user.toPrivateProfile(),
      accessToken,
      refreshToken,
    };
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshTokenValue) {
    try {
      const decoded = jwt.verify(refreshTokenValue, process.env.JWT_REFRESH_SECRET);
      const user = await User.findById(decoded.userId);

      if (!user || user.status !== 'active') {
        throw ApiError.unauthorized('User không tồn tại hoặc đã bị khóa');
      }

      // Verify refresh token exists in DB
      const tokenHash = hashToken(refreshTokenValue);
      const storedToken = user.refreshTokens.find(rt => rt.token === tokenHash);
      if (!storedToken) {
        throw ApiError.unauthorized('Refresh token không hợp lệ');
      }

      // Token rotation: generate new pair
      const { accessToken, refreshToken: newRefreshToken } = this.generateTokens(
        user._id,
        decoded.deviceId
      );

      // Replace old refresh token
      user.refreshTokens = user.refreshTokens.filter(rt => rt.token !== tokenHash);
      user.refreshTokens.push({
        token: hashToken(newRefreshToken),
        deviceId: decoded.deviceId,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
      await user.save();

      return { accessToken, refreshToken: newRefreshToken };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw ApiError.unauthorized('Refresh token không hợp lệ hoặc đã hết hạn');
    }
  }

  /**
   * Logout current device
   */
  async logout(userId, deviceId) {
    const user = await User.findById(userId);
    if (!user) return;

    // Remove refresh token for this device
    user.refreshTokens = user.refreshTokens.filter(rt => rt.deviceId !== deviceId);
    // Remove FCM token for this device
    user.fcmTokens = user.fcmTokens.filter(t => t.deviceId !== deviceId);
    await user.save();

    // Deactivate device session
    await DeviceSession.findOneAndUpdate(
      { user: userId, deviceId },
      { isActive: false, logoutAt: new Date(), socketId: null }
    );

    // Clean Redis presence
    const redis = getRedis();
    await redis.srem(`user:${userId}:sockets`, '*');

    logger.info(`User logged out: ${userId} from device ${deviceId}`);
  }

  /**
   * Logout all devices
   */
  async logoutAll(userId) {
    const user = await User.findById(userId);
    if (!user) return;

    user.refreshTokens = [];
    user.fcmTokens = [];
    await user.save();

    await DeviceSession.updateMany(
      { user: userId },
      { isActive: false, logoutAt: new Date(), socketId: null }
    );

    // Clean Redis
    const redis = getRedis();
    await redis.del(`user:${userId}:sockets`);
    await redis.del(`user:${userId}:online`);

    logger.info(`User logged out from all devices: ${userId}`);
  }

  /**
   * Change password
   */
  async changePassword(userId, currentPassword, newPassword) {
    const user = await User.findById(userId).select('+password');
    if (!user) {
      throw ApiError.notFound('User không tồn tại');
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      throw ApiError.badRequest('Mật khẩu hiện tại không đúng');
    }

    user.password = newPassword;
    // Invalidate all refresh tokens except current
    user.refreshTokens = [];
    await user.save();

    logger.info(`User changed password: ${userId}`);
  }

  /**
   * Delete account
   */
  async deleteAccount(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound('User không tồn tại');
    }

    user.status = 'deleted';
    user.deletedAt = new Date();
    user.refreshTokens = [];
    user.fcmTokens = [];
    await user.save();

    await DeviceSession.updateMany(
      { user: userId },
      { isActive: false, logoutAt: new Date() }
    );

    logger.info(`User deleted account: ${userId}`);
  }

  /**
   * Generate access + refresh tokens
   */
  generateTokens(userId, deviceId) {
    const accessToken = jwt.sign(
      { userId, deviceId },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m' }
    );

    const refreshToken = jwt.sign(
      { userId, deviceId },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
    );

    return { accessToken, refreshToken };
  }
}

module.exports = new AuthService();
