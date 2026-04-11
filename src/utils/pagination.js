const { PAGINATION } = require('../config/constants');

/**
 * Parse cursor-based pagination parameters
 */
const parsePagination = (query) => {
  const limit = Math.min(
    parseInt(query.limit) || PAGINATION.DEFAULT_LIMIT,
    PAGINATION.MAX_LIMIT
  );
  const cursor = query.cursor || null;

  return { limit, cursor };
};

/**
 * Build cursor-based pagination response
 * @param {Array} items - fetched items (should fetch limit + 1)
 * @param {Number} limit - requested limit
 * @param {Function} getCursorFn - function to extract cursor value from an item
 */
const buildPagination = (items, limit, getCursorFn) => {
  const hasMore = items.length > limit;
  const results = hasMore ? items.slice(0, limit) : items;
  const nextCursor = hasMore && results.length > 0
    ? getCursorFn(results[results.length - 1])
    : null;

  return {
    results,
    pagination: {
      nextCursor,
      hasMore,
      limit,
    },
  };
};

/**
 * Build offset-based pagination (for simple cases)
 */
const parseOffsetPagination = (query) => {
  const page = Math.max(parseInt(query.page) || 1, 1);
  const limit = Math.min(
    parseInt(query.limit) || PAGINATION.DEFAULT_LIMIT,
    PAGINATION.MAX_LIMIT
  );
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

const buildOffsetPagination = (total, page, limit) => ({
  total,
  page,
  limit,
  totalPages: Math.ceil(total / limit),
  hasMore: page * limit < total,
});

module.exports = {
  parsePagination,
  buildPagination,
  parseOffsetPagination,
  buildOffsetPagination,
};
