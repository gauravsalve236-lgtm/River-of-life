/**
 * Centralized Production Error Handler Middleware
 * Formats clean JSON error responses, logs internal diagnostic details,
 * and ensures sensitive stack traces and secrets are never exposed to clients.
 */

function errorHandler(err, req, res, next) {
  // Log internal diagnostic traceback for server-side troubleshooting
  console.error(`[SERVER-ERROR] ${req.method} ${req.originalUrl}:`, err);

  const statusCode = err.status || err.statusCode || 500;
  const isProd = process.env.NODE_ENV === 'production';

  // Standardized JSON error response
  res.status(statusCode).json({
    error: isProd && statusCode === 500 ? 'An internal server error occurred. Please try again later.' : (err.message || 'Internal Server Error'),
    code: err.code || 'SERVER_ERROR',
    timestamp: new Date().toISOString()
  });
}

function notFoundHandler(req, res) {
  res.status(404).json({
    error: `Route '${req.originalUrl}' not found on River of Life API.`,
    code: 'NOT_FOUND',
    timestamp: new Date().toISOString()
  });
}

module.exports = {
  errorHandler,
  notFoundHandler
};
