const ApiError = require('../utils/ApiError');

/**
 * Joi validation middleware factory
 * @param {Object} schema - Joi schema with optional body, query, params keys
 */
const validate = (schema) => (req, res, next) => {
  const validationErrors = [];

  ['params', 'query', 'body'].forEach((key) => {
    if (schema[key]) {
      const { error, value } = schema[key].validate(req[key], {
        abortEarly: false,
        stripUnknown: true,
        allowUnknown: false,
      });

      if (error) {
        error.details.forEach((detail) => {
          validationErrors.push({
            field: detail.path.join('.'),
            message: detail.message.replace(/"/g, ''),
          });
        });
      } else {
        // Replace with validated/sanitized values
        req[key] = value;
      }
    }
  });

  if (validationErrors.length > 0) {
    throw ApiError.validationError(
      'Dữ liệu không hợp lệ',
      validationErrors
    );
  }

  next();
};

module.exports = validate;
