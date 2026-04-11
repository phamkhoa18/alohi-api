const { getRedis } = require('../config/redis');
const { generateOTP } = require('../utils/helpers');
const { TIMEOUTS, REDIS_KEYS } = require('../config/constants');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');

class OTPService {
  /**
   * Generate and store OTP
   */
  async sendOTP(phone) {
    const redis = getRedis();
    const key = REDIS_KEYS.OTP(phone);

    // Check if OTP already exists and not expired
    const existing = await redis.hgetall(key);
    if (existing && existing.code) {
      const createdAt = parseInt(existing.createdAt);
      const elapsed = (Date.now() - createdAt) / 1000;
      if (elapsed < 60) {
        throw ApiError.tooManyRequests('Vui lòng đợi 60 giây trước khi gửi OTP mới');
      }
    }

    const code = generateOTP();

    // Store OTP in Redis
    await redis.hmset(key, {
      code,
      attempts: 0,
      createdAt: Date.now().toString(),
    });
    await redis.expire(key, TIMEOUTS.OTP_TTL); // 5 minutes

    // In production, send via Twilio/Firebase
    // For development, log the OTP
    if (process.env.NODE_ENV === 'development') {
      logger.info(`📱 OTP for ${phone}: ${code}`);
    } else {
      // TODO: Send via Twilio
      // await twilioClient.messages.create({
      //   body: `[Alohi] Mã xác minh của bạn là: ${code}. Có hiệu lực trong 5 phút.`,
      //   from: process.env.TWILIO_PHONE_NUMBER,
      //   to: phone,
      // });
      logger.info(`OTP sent to ${phone}`);
    }

    return { message: 'OTP đã được gửi', expiresIn: TIMEOUTS.OTP_TTL };
  }

  /**
   * Verify OTP code
   */
  async verifyOTP(phone, code) {
    const redis = getRedis();
    const key = REDIS_KEYS.OTP(phone);

    const otpData = await redis.hgetall(key);
    if (!otpData || !otpData.code) {
      throw ApiError.badRequest('OTP đã hết hạn hoặc không tồn tại');
    }

    // Check attempts
    const attempts = parseInt(otpData.attempts) || 0;
    if (attempts >= 5) {
      await redis.del(key);
      throw ApiError.tooManyRequests('Quá nhiều lần thử, vui lòng gửi OTP mới');
    }

    // Increment attempts
    await redis.hincrby(key, 'attempts', 1);

    if (otpData.code !== code) {
      throw ApiError.badRequest('Mã OTP không đúng');
    }

    // OTP verified — delete it
    await redis.del(key);

    return true;
  }
}

module.exports = new OTPService();
