/**
 * Utility to create consistent API responses.
 */

const sendSuccess = (res, statusCode = 200, message = 'Success', data = {}) => {
  res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

const sendError = (res, statusCode = 500, message = 'Internal Server Error') => {
  res.status(statusCode).json({
    success: false,
    message,
  });
};

/**
 * Wraps an async route handler to automatically catch errors
 * and pass them to Express error handling middleware.
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Creates an AppError with a specific HTTP status code.
 */
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = { sendSuccess, sendError, asyncHandler, AppError };
