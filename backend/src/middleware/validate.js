// src/middleware/validate.js
// Reads the result of express-validator chains and short-circuits
// with a 422 Unprocessable Entity if any validation errors exist.

const { validationResult } = require('express-validator');
const { sendError }        = require('../utils/response');
const { HTTP_STATUS }      = require('../config/constants');

/**
 * Run after express-validator check() chains.
 * Automatically returns a 422 with all field errors if validation fails.
 * Usage: router.post('/signup', signupRules, validate, controller.signup)
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return sendError(
      res,
      'Validation failed.',
      HTTP_STATUS.UNPROCESSABLE_ENTITY,
      errors.array().map((e) => ({ field: e.path, message: e.msg })),
    );
  }

  next();
};

module.exports = validate;
