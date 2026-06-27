// src/middleware/authenticate.js
// Verifies the Bearer JWT on every protected route.
// Attaches the decoded user payload to req.user.

const { verifyToken } = require('../utils/jwt');
const { sendError }   = require('../utils/response');
const { HTTP_STATUS } = require('../config/constants');

/**
 * Express middleware — authenticate incoming request via JWT.
 * Usage: router.get('/me', authenticate, controller.me)
 */
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return sendError(res, 'Authorization token is required.', HTTP_STATUS.UNAUTHORIZED);
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyToken(token);
    req.user = decoded; // { id, email, role, iat, exp }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return sendError(res, 'Token has expired.', HTTP_STATUS.UNAUTHORIZED);
    }
    return sendError(res, 'Invalid token.', HTTP_STATUS.UNAUTHORIZED);
  }
};

module.exports = authenticate;
