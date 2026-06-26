// src/modules/events/event.validation.js
// express-validator rule arrays for event endpoints.

const { query } = require('express-validator');

/**
 * Validation for GET /events query parameters.
 * All params are optional — only validate format when present.
 */
const listEventsRules = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('page must be a positive integer.')
    .toInt(),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be between 1 and 100.')
    .toInt(),

  query('search')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('search must not exceed 100 characters.'),

  query('date')
    .optional()
    .isISO8601()
    .withMessage('date must be a valid ISO 8601 date (e.g. 2026-07-01).')
    .toDate(),
];

module.exports = { listEventsRules };
