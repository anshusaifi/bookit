// src/utils/jwt.js
// Thin wrappers around jsonwebtoken so the rest of the app
// never imports jsonwebtoken directly.

const jwt = require('jsonwebtoken');
const { JWT_EXPIRES_IN } = require('../config/constants');

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Sign a JWT for the given user payload.
 * @param {{ id: string, email: string, role: string }} payload
 * @returns {string} signed token
 */
const signToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

/**
 * Verify and decode a JWT.
 * Throws JsonWebTokenError / TokenExpiredError on failure.
 * @param {string} token
 * @returns {object} decoded payload
 */
const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};

module.exports = { signToken, verifyToken };
