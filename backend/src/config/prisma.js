// src/config/prisma.js
// Single shared PrismaClient instance for the entire application.
// Importing from here ensures we never open more than one connection pool.

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

module.exports = prisma;
