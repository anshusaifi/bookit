// src/routes/index.js
// Central router — mounts every module under its base path.

const { Router }        = require('express');
const authRoutes        = require('../modules/auth/auth.routes');
const eventRoutes       = require('../modules/events/event.routes');
const bookingRoutes     = require('../modules/bookings/booking.routes');
const organizerRoutes   = require('../modules/organizer/organizer.routes');

const router = Router();

router.use('/auth',              authRoutes);
router.use('/events',            eventRoutes);
router.use('/',                  bookingRoutes);     // /events/:id/book, /me/bookings, /bookings/:id
router.use('/organizer/events',  organizerRoutes);

module.exports = router;
