const rateLimit = require('express-rate-limit');
// const RedisStore = require('rate-limit-redis').default;
// const { getRedis } = require('../config/redis');

/**
 * Create rate limiter (memory-based for simplicity, switch to Redis in production)
 */
const createLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      statusCode: 429,
      message: message || 'Quá nhiều yêu cầu, vui lòng thử lại sau',
      error: { code: 'TOO_MANY_REQUESTS' },
      timestamp: new Date().toISOString(),
    },
    standardHeaders: true,
    legacyHeaders: false,
    // For production with Redis:
    // store: new RedisStore({
    //   sendCommand: (...args) => getRedis().call(...args),
    // }),
  });
};

// === Pre-configured limiters ===

const authOtpLimiter = createLimiter(
  5 * 60 * 1000, // 5 min
  3,
  'Quá nhiều yêu cầu OTP, vui lòng thử lại sau 5 phút'
);

const authLoginLimiter = createLimiter(
  15 * 60 * 1000, // 15 min
  5,
  'Quá nhiều lần đăng nhập thất bại, vui lòng thử lại sau 15 phút'
);

const authRegisterLimiter = createLimiter(
  60 * 60 * 1000, // 1 hour
  3,
  'Quá nhiều lần đăng ký, vui lòng thử lại sau 1 giờ'
);

const messageLimiter = createLimiter(
  60 * 1000, // 1 min
  60,
  'Gửi tin nhắn quá nhanh, vui lòng chậm lại'
);

const uploadLimiter = createLimiter(
  5 * 60 * 1000, // 5 min
  20,
  'Upload quá nhiều file, vui lòng thử lại sau'
);

const searchLimiter = createLimiter(
  60 * 1000, // 1 min
  30,
  'Tìm kiếm quá nhiều, vui lòng thử lại sau'
);

const generalLimiter = createLimiter(
  60 * 1000, // 1 min
  100,
  'Quá nhiều yêu cầu, vui lòng thử lại sau'
);

module.exports = {
  createLimiter,
  authOtpLimiter,
  authLoginLimiter,
  authRegisterLimiter,
  messageLimiter,
  uploadLimiter,
  searchLimiter,
  generalLimiter,
};
