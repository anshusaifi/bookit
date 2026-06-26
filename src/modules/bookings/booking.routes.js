// src/modules/bookings/booking.routes.js

const { Router }    = require('express');
const controller    = require('./booking.controller');
const authenticate  = require('../../middleware/authenticate');

const router = Router();

// POST /events/:id/book — book a seat (user must be logged in)
router.post('/events/:id/book', authenticate, controller.bookEvent);

// GET /me/bookings — my bookings
router.get('/me/bookings', authenticate, controller.getMyBookings);

// DELETE /bookings/:id — cancel a booking
router.delete('/bookings/:id', authenticate, controller.cancelBooking);

module.exports = router;
