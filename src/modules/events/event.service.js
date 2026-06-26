// src/modules/events/event.service.js
// All event business logic lives here.

const eventRepo          = require('./event.repository');
const { ACTIVITY_TYPE }  = require('../../config/constants');

/**
 * Build the enriched event shape that clients receive.
 * Computes remainingSeats and soldOut from confirmed booking count.
 *
 * @param {object} event    - Raw event from Prisma
 * @param {number} confirmed - Count of CONFIRMED bookings for this event
 * @returns {object}
 */
const formatEvent = (event, confirmed) => {
  const remainingSeats = event.capacity - confirmed;
  return {
    id:             event.id,
    title:          event.title,
    venue:          event.venue,
    eventDate:      event.eventDate,
    price:          event.price,
    capacity:       event.capacity,
    remainingSeats,
    soldOut:        remainingSeats <= 0,
    organizerId:    event.organizerId,
  };
};

/**
 * Get a paginated, optionally filtered list of events.
 * @param {{ search?, date?, page, limit }} query
 * @returns {{ events, pagination }}
 */
const listEvents = async ({ search, date, page, limit }) => {
  const { events, total } = await eventRepo.findMany({ search, date, page, limit });

  const formatted = events.map((event) => {
    // _count.bookings is the number of CONFIRMED bookings returned by Prisma
    const confirmed = event._count?.bookings ?? 0;
    return formatEvent(event, confirmed);
  });

  return {
    events: formatted,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get a single event by id.
 * Also logs an EVENT_VIEWED activity entry.
 * @param {string} eventId
 * @param {string|null} userId - null for anonymous viewers
 * @returns {object} enriched event with organizer
 */
const getEventById = async (eventId, userId = null) => {
  const event = await eventRepo.findById(eventId);

  if (!event) {
    const err = new Error('Event not found.');
    err.statusCode = 404;
    throw err;
  }

  const confirmed     = await eventRepo.countConfirmedBookings(eventId);
  const remainingSeats = event.capacity - confirmed;

  // Log view — fire-and-forget, do NOT await (doesn't affect response time)
  eventRepo.createActivityLog({
    activityType: ACTIVITY_TYPE.EVENT_VIEWED,
    eventId,
    userId: userId ?? undefined,
  }).catch((err) => console.error('[ActivityLog] EVENT_VIEWED failed:', err));

  return {
    id:            event.id,
    title:         event.title,
    description:   event.description,
    venue:         event.venue,
    eventDate:     event.eventDate,
    price:         event.price,
    capacity:      event.capacity,
    remainingSeats,
    soldOut:       remainingSeats <= 0,
    organizer:     event.organizer,
    createdAt:     event.createdAt,
  };
};

module.exports = { listEvents, getEventById };
