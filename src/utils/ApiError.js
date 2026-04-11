/**
 * Custom API Error class
 */
class ApiError extends Error {
  constructor(statusCode, message, errors = [], code = null) {
    super(message);
    this.statusCode = statusCode;
    this.success = false;
    this.errors = errors;
    this.code = code || this.constructor.getCodeFromStatus(statusCode);
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }

  static getCodeFromStatus(statusCode) {
    const map = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'VALIDATION_ERROR',
      429: 'TOO_MANY_REQUESTS',
      500: 'INTERNAL_ERROR',
    };
    return map[statusCode] || 'UNKNOWN_ERROR';
  }

  // === Factory Methods ===
  static badRequest(message = 'Bad request', errors = []) {
    return new ApiError(400, message, errors, 'BAD_REQUEST');
  }

  static unauthorized(message = 'Unauthorized') {
    return new ApiError(401, message, [], 'UNAUTHORIZED');
  }

  static forbidden(message = 'Forbidden') {
    return new ApiError(403, message, [], 'FORBIDDEN');
  }

  static notFound(message = 'Resource not found') {
    return new ApiError(404, message, [], 'NOT_FOUND');
  }

  static conflict(message = 'Resource already exists') {
    return new ApiError(409, message, [], 'CONFLICT');
  }

  static validationError(message = 'Validation error', errors = []) {
    return new ApiError(422, message, errors, 'VALIDATION_ERROR');
  }

  static tooManyRequests(message = 'Too many requests') {
    return new ApiError(429, message, [], 'TOO_MANY_REQUESTS');
  }

  static internal(message = 'Internal server error') {
    return new ApiError(500, message, [], 'INTERNAL_ERROR');
  }
}

module.exports = ApiError;
