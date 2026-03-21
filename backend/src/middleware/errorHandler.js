/**
 * Global error-handling middleware (4-param signature).
 * Must be the LAST middleware registered on the Express app.
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  console.error('Unhandled error:', err.stack || err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { errors: [{ stack: err.stack }] }),
  });
};

module.exports = { errorHandler };
