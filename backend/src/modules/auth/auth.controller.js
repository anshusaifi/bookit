// src/modules/auth/auth.controller.js
// Controllers are intentionally thin — they only:
//   1. Call the service
//   2. Send the response
// No business logic here.

const authService        = require('./auth.service');
const { sendSuccess, sendError } = require('../../utils/response');
const { HTTP_STATUS }    = require('../../config/constants');

const signup = async (req, res, next) => {
  try {
    const { user, token } = await authService.signup(req.body);
    return sendSuccess(res, { user, token }, HTTP_STATUS.CREATED);
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { user, token } = await authService.login(req.body);
    return sendSuccess(res, { user, token });
  } catch (err) {
    next(err);
  }
};

/**
 * Stateless JWT logout.
 * Token invalidation is client-side (drop the token).
 * Server simply acknowledges — future refresh token implementation goes here.
 */
const logout = (_req, res) => {
  return sendSuccess(res, { message: 'Logged out successfully.' });
};

const me = async (req, res, next) => {
  try {
    const user = await authService.getMe(req.user.id);
    return sendSuccess(res, { user });
  } catch (err) {
    next(err);
  }
};

module.exports = { signup, login, logout, me };
