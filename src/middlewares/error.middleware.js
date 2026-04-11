const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');

/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  error.stack = err.stack;

  // Log error
  if (err.statusCode !== 404) {
    logger.error(`${err.message}`, {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userId: req.user?._id,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
  }

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    error = ApiError.badRequest(`ID không hợp lệ: ${err.value}`);
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    error = ApiError.conflict(`${field} đã tồn tại`);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    error = ApiError.validationError('Dữ liệu không hợp lệ', errors);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = ApiError.unauthorized('Token không hợp lệ');
  }
  if (err.name === 'TokenExpiredError') {
    error = ApiError.unauthorized('Token đã hết hạn');
  }

  // Multer errors
  if (err.name === 'MulterError') {
    error = ApiError.badRequest(err.message);
  }

  const statusCode = error.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    statusCode,
    message: error.message || 'Lỗi hệ thống',
    error: {
      code: error.code || 'INTERNAL_ERROR',
      details: error.errors || [],
    },
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    timestamp: new Date().toISOString(),
  });
};

/**
 * 404 handler
 */
const notFoundHandler = (req, res, next) => {
  next(ApiError.notFound(`Không tìm thấy route: ${req.method} ${req.originalUrl}`));
};

module.exports = { errorHandler, notFoundHandler };
