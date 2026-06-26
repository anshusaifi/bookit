// src/modules/events/event.routes.js
// GET /events — public with optional auth (for activity log)
// GET /events/:id — public with optional auth

const { Router }      = require('express');
const controller      = require('./event.controller');
const { listEventsRules } = require('./event.validation');
const validate        = require('../../middleware/validate');
const authenticate    = require('../../middleware/authenticate');

const router = Router();

/**
 * Optional authentication middleware.
 * If a valid Bearer token is present, populates req.user.
 * If absent or invalid, simply continues — does NOT block the request.
 * Used on public routes where we want to log the user id when available.
 */
const optionalAuth = (req, _res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return next();

  const { verifyToken } = require('../../utils/jwt');
  try {
    req.user = verifyToken(authHeader.split(' ')[1]);
  } catch {
    // Invalid token on a public route — silently ignore
  }
  next();
};

// GET /events
router.get('/', listEventsRules, validate, optionalAuth, controller.listEvents);

// GET /events/:id
router.get('/:id', optionalAuth, controller.getEventById);

module.exports = router;
