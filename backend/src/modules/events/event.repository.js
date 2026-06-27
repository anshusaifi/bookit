// src/modules/events/event.repository.js
// All Prisma queries for Events and ActivityLog live here.
// Services must not import prisma directly.

const prisma                 = require('../../config/prisma');
const { BOOKING_STATUS }     = require('../../config/constants');

/**
 * Count confirmed bookings for an event.
 * Uses the Booking_eventId_status_idx composite index — O(log n).
 * @param {string} eventId
 * @returns {Promise<number>}
 */
const countConfirmedBookings = (eventId) => {
  return prisma.booking.count({
    where: { eventId, status: BOOKING_STATUS.CONFIRMED },
  });
};

/**
 * Paginated event listing with optional search and date filter.
 * Returns events + their confirmed booking count in one round trip.
 *
 * @param {{
 *   search?:   string,
 *   date?:     string,   // ISO date string, e.g. "2026-07-01"
 *   page:      number,
 *   limit:     number,
 * }} params
 * @returns {Promise<{ events: object[], total: number }>}
 */
const findMany = async ({ search, date, page, limit }) => {
  const pageNum  = parseInt(page,  10) || 1;
  const limitNum = parseInt(limit, 10) || 20;
  const skip = (pageNum - 1) * limitNum;

  const where = {};

  if (search) {
    where.title = { contains: search, mode: 'insensitive' };
  }

  if (date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    where.eventDate = { gte: start, lte: end };
  }

  const [events, total] = await prisma.$transaction([
    prisma.event.findMany({
      where,
      skip,
      take:    limitNum,
      orderBy: { eventDate: 'asc' },
      select: {
        id:          true,
        title:       true,
        venue:       true,
        eventDate:   true,
        price:       true,
        capacity:    true,
        organizerId: true,
        _count: {
          select: {
            bookings: { where: { status: BOOKING_STATUS.CONFIRMED } },
          },
        },
      },
    }),
    prisma.event.count({ where }),
  ]);

  return { events, total };
};

/**
 * Find a single event by id, including organizer info.
 * @param {string} id
 * @returns {Promise<object|null>}
 */
const findById = (id) => {
  return prisma.event.findUnique({
    where:  { id },
    include: {
      organizer: {
        select: { id: true, name: true, email: true },
      },
    },
  });
};

/**
 * Insert an ActivityLog entry.
 * @param {{ activityType: string, eventId: string, userId?: string }} data
 * @returns {Promise<object>}
 */
const createActivityLog = (data) => {
  return prisma.activityLog.create({ data });
};

module.exports = {
  countConfirmedBookings,
  findMany,
  findById,
  createActivityLog,
};
