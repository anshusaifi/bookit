// src/modules/auth/auth.routes.js

const { Router }    = require('express');
const controller    = require('./auth.controller');
const { signupRules, loginRules } = require('./auth.validation');
const validate      = require('../../middleware/validate');
const authenticate  = require('../../middleware/authenticate');

const router = Router();

// POST /auth/signup
router.post('/signup', signupRules, validate, controller.signup);

// POST /auth/login
router.post('/login', loginRules, validate, controller.login);

// POST /auth/logout  — protected (client must send token to prove it owns one)
router.post('/logout', authenticate, controller.logout);

// GET /auth/me — protected
router.get('/me', authenticate, controller.me);

module.exports = router;
