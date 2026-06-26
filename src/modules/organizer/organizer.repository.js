// src/modules/organizer/organizer.repository.js
// Prisma queries for organizer-only operations.

const prisma              = require('../../config/prisma');
const { BOOKING_STATUS }  = require('../../config/constants');

/**
 * Create a new event.
 */
const createEvent = (data) => {
  return prisma.event.create({ data });
};

/**
 * Update an event. Only the organizer's own events.
 */
const updateEvent = (id, data) => {
  return prisma.event.update({ where: { id }, data });
};

/**
 * Find an event by id (used for ownership checks).
 */
const findEventById = (id) => {
  return prisma.event.findUnique({ where: { id } });
};

/**
 * Get all events for an organizer with confirmed booking counts.
 */
const findEventsByOrganizer = (organizerId) => {
  return prisma.event.findMany({
    where:   { organizerId },
    orderBy: { eventDate: 'desc' },
    include: {
      _count: {
        select: {
          bookings: { where: { status: BOOKING_STATUS.CONFIRMED } },
        },
      },
    },
  });
};

/**
 * Get confirmed attendees for a specific event.
 */
const findAttendees = (eventId) => {
  return prisma.booking.findMany({
    where: { eventId, status: BOOKING_STATUS.CONFIRMED },
    orderBy: { createdAt: 'asc' },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
  });
};

/**
 * Compute analytics for one event from the activity_log table.
 * Returns counts grouped by activity type.
 */
const getAnalytics = async (eventId) => {
  const rows = await prisma.activityLog.groupBy({
    by:    ['activityType'],
    where: { eventId },
    _count: { activityType: true },
  });

  // Build a lookup map
  const map = {};
  rows.forEach((r) => { map[r.activityType] = r._count.activityType; });

  const views     = map['EVENT_VIEWED']       || 0;
  const started   = map['BOOKING_STARTED']    || 0;
  const confirmed = map['BOOKING_CONFIRMED']  || 0;
  const cancelled = map['BOOKING_CANCELLED']  || 0;

  return {
    views,
    bookingsStarted:   started,
    bookingsConfirmed: confirmed,
    bookingsCancelled: cancelled,
    conversionRate:    views > 0 ? ((confirmed / views) * 100).toFixed(1) + '%' : '0%',
  };
};

module.exports = { createEvent, updateEvent, findEventById, findEventsByOrganizer, findAttendees, getAnalytics };
