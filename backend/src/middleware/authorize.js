// src/middleware/authorize.js
// Role-based authorization middleware factory.
// Always use AFTER authenticate — requires req.user to be populated.

const { sendError }   = require('../utils/response');
const { HTTP_STATUS } = require('../config/constants');

/**
 * Authorization middleware factory.
 * @param  {...string} allowedRoles - e.g. authorize('ORGANIZER') or authorize('USER','ORGANIZER')
 * @returns {import('express').RequestHandler}
 *
 * Usage:
 *   router.post('/events', authenticate, authorize('ORGANIZER'), controller.create)
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      // Defensive guard — authenticate must run before authorize
      return sendError(res, 'Not authenticated.', HTTP_STATUS.UNAUTHORIZED);
    }

    if (!allowedRoles.includes(req.user.role)) {
      return sendError(
        res,
        'You do not have permission to perform this action.',
        HTTP_STATUS.FORBIDDEN,
      );
    }

    next();
  };
};

module.exports = authorize;
