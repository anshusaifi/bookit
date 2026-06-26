// src/utils/response.js
// Centralized response helpers to enforce a consistent JSON envelope
// across every endpoint in the application.

/**
 * Send a success response.
 * @param {import('express').Response} res
 * @param {*} data      - Payload to send under the `data` key.
 * @param {number} statusCode
 */
const sendSuccess = (res, data, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    data,
  });
};

/**
 * Send an error response.
 * @param {import('express').Response} res
 * @param {string} message  - Human-readable error description.
 * @param {number} statusCode
 * @param {Array}  errors   - Optional field-level validation errors.
 */
const sendError = (res, message, statusCode = 500, errors = []) => {
  const body = { success: false, message };
  if (errors.length > 0) body.errors = errors;
  return res.status(statusCode).json(body);
};

module.exports = { sendSuccess, sendError };
