/**
 * Centralized RFC 7807 Compliant Error Handling Middleware
 */
const errorHandler = (err, req, res, next) => {
  console.error(`[ERROR] ${req.method} ${req.originalUrl}:`, err.message);

  const statusCode = err.statusCode || (err.name === 'ValidationError' ? 400 : 500);
  const errorCode = err.code || (statusCode === 400 ? 'VALIDATION_FAILED' : 'INTERNAL_SERVER_ERROR');

  res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message: err.message || 'An unexpected error occurred while processing the request.',
      details: err.details || null
    }
  });
};

module.exports = {
  errorHandler
};
