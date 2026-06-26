// src/middleware/errorHandler.js
// Global error handler — must be the LAST middleware registered in app.js.
// Catches any error passed via next(err) or unhandled throws in async routes.

const { sendError } = require('../utils/response');

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  console.error(`[ERROR] ${req.method} ${req.originalUrl}`, err);

  // Prisma known request errors (e.g. unique constraint violations)
  if (err.code === 'P2002') {
    return sendError(res, 'A record with this value already exists.', 409);
  }

  // Prisma not-found errors
  if (err.code === 'P2025') {
    return sendError(res, 'Record not found.', 404);
  }

  const statusCode = err.statusCode || err.status || 500;
  const message    = err.message    || 'Internal server error.';

  return sendError(res, message, statusCode);
};

module.exports = errorHandler;
