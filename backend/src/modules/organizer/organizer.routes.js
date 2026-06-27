// src/modules/organizer/organizer.routes.js
// All routes require authentication + ORGANIZER role.

const { Router }   = require('express');
const controller   = require('./organizer.controller');
const authenticate = require('../../middleware/authenticate');
const authorize    = require('../../middleware/authorize');
const { ROLES }    = require('../../config/constants');

const router = Router();

// All organizer routes are protected
router.use(authenticate, authorize(ROLES.ORGANIZER));

// POST   /organizer/events          — create event
router.post('/',               controller.createEvent);

// GET    /organizer/events          — list own events with sold counts
router.get('/',                controller.getMyEvents);

// PATCH  /organizer/events/:id      — edit event
router.patch('/:id',           controller.editEvent);

// GET    /organizer/events/:id/attendees  — attendee list
router.get('/:id/attendees',   controller.getAttendees);

// GET    /organizer/events/:id/analytics — analytics
router.get('/:id/analytics',   controller.getAnalytics);

module.exports = router;
