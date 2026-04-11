/**
 * Standardized API Response
 */
class ApiResponse {
  constructor(statusCode, message, data = null, pagination = null) {
    this.success = statusCode < 400;
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
    if (pagination) {
      this.pagination = pagination;
    }
    this.timestamp = new Date().toISOString();
  }

  // === Factory Methods ===
  static success(data, message = 'Success') {
    return new ApiResponse(200, message, data);
  }

  static created(data, message = 'Created successfully') {
    return new ApiResponse(201, message, data);
  }

  static noContent(message = 'Deleted successfully') {
    return new ApiResponse(204, message);
  }

  static paginated(data, pagination, message = 'Success') {
    return new ApiResponse(200, message, data, pagination);
  }

  /**
   * Send response via Express res object
   */
  send(res) {
    return res.status(this.statusCode).json(this);
  }
}

module.exports = ApiResponse;
