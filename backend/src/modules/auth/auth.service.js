// src/modules/auth/auth.service.js
// All auth business logic lives here.
// Throws plain Error objects with a statusCode property
// so the global errorHandler can format them correctly.

const bcrypt      = require('bcrypt');
const authRepo    = require('./auth.repository');
const { signToken } = require('../../utils/jwt');

const BCRYPT_ROUNDS = 10;

/**
 * Register a new user.
 * @param {{ name, email, password, role }} dto
 * @returns {{ user, token }}
 */
const signup = async ({ name, email, password, role }) => {
  const existing = await authRepo.findByEmail(email);
  if (existing) {
    const err = new Error('An account with this email already exists.');
    err.statusCode = 409;
    throw err;
  }

  const hashed = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const user = await authRepo.createUser({
    name,
    email,
    password: hashed,
    role,
  });

  const token = signToken({ id: user.id, email: user.email, role: user.role });

  return { user, token };
};

/**
 * Authenticate an existing user.
 * @param {{ email, password }} dto
 * @returns {{ user, token }}
 */
const login = async ({ email, password }) => {
  // Fetch the full record including the password hash for comparison
  const record = await authRepo.findByEmail(email);

  if (!record) {
    const err = new Error('Invalid email or password.');
    err.statusCode = 401;
    throw err;
  }

  const passwordMatch = await bcrypt.compare(password, record.password);
  if (!passwordMatch) {
    const err = new Error('Invalid email or password.');
    err.statusCode = 401;
    throw err;
  }

  // Build a safe user object — never expose the password hash
  const user = {
    id:        record.id,
    name:      record.name,
    email:     record.email,
    role:      record.role,
    createdAt: record.createdAt,
  };

  const token = signToken({ id: user.id, email: user.email, role: user.role });

  return { user, token };
};

/**
 * Fetch the currently authenticated user's profile.
 * @param {string} userId
 * @returns {object} user
 */
const getMe = async (userId) => {
  const user = await authRepo.findById(userId);
  if (!user) {
    const err = new Error('User not found.');
    err.statusCode = 404;
    throw err;
  }
  return user;
};

module.exports = { signup, login, getMe };
