// src/routes/index.js
// Central router — mounts every module under its base path.
// Adding a new module only requires one line here.

const { Router } = require('express');
const authRoutes  = require('../modules/auth/auth.routes');
const eventRoutes = require('../modules/events/event.routes');

const router = Router();

router.use('/auth',   authRoutes);
router.use('/events', eventRoutes);

module.exports = router;
