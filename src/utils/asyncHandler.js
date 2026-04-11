/**
 * Async handler wrapper — eliminates try/catch in every controller
 * @param {Function} fn - async controller function
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
