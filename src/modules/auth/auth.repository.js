// src/modules/auth/auth.repository.js
// All Prisma interactions for the auth module live here.
// Services must never import prisma directly.

const prisma = require('../../config/prisma');

/**
 * Find a user by their email address.
 * @param {string} email
 * @returns {Promise<object|null>}
 */
const findByEmail = (email) => {
  return prisma.user.findUnique({ where: { email } });
};

/**
 * Find a user by their primary key.
 * @param {string} id
 * @returns {Promise<object|null>}
 */
const findById = (id) => {
  return prisma.user.findUnique({
    where:  { id },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });
};

/**
 * Insert a new user record.
 * @param {{ name: string, email: string, password: string, role: string }} data
 * @returns {Promise<object>} the created user (without password)
 */
const createUser = (data) => {
  return prisma.user.create({
    data,
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });
};

module.exports = { findByEmail, findById, createUser };
