// src/modules/auth/auth.validation.js
// express-validator rule arrays for each auth endpoint.
// Imported by routes and used before the validate middleware.

const { body }   = require('express-validator');
const { ROLES }  = require('../../config/constants');

const signupRules = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required.'),

  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required.')
    .isEmail()
    .withMessage('Please provide a valid email address.')
    .normalizeEmail(),

  body('password')
    .notEmpty()
    .withMessage('Password is required.')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters.'),

  body('role')
    .notEmpty()
    .withMessage('Role is required.')
    .isIn(Object.values(ROLES))
    .withMessage(`Role must be one of: ${Object.values(ROLES).join(', ')}.`),
];

const loginRules = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required.')
    .isEmail()
    .withMessage('Please provide a valid email address.')
    .normalizeEmail(),

  body('password')
    .notEmpty()
    .withMessage('Password is required.'),
];

module.exports = { signupRules, loginRules };
