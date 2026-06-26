// src/modules/bookings/booking.repository.js
// All Prisma queries for Bookings live here.

const prisma              = require('../../config/prisma');
const { BOOKING_STATUS }  = require('../../config/constants');

/**
 * Find a single booking by id, including event details.
 */
const findById = (id) => {
  return prisma.booking.findUnique({
    where: { id },
    include: {
      event: {
        select: { id: true, title: true, venue: true, eventDate: true, price: true, organizerId: true },
      },
    },
  });
};

/**
 * Check if a user already has an active booking for an event.
 */
const findActiveBooking = (userId, eventId) => {
  return prisma.booking.findUnique({
    where: { userId_eventId: { userId, eventId } },
  });
};

/**
 * Get all bookings for a user with event details.
 */
const findByUser = (userId) => {
  return prisma.booking.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      event: {
        select: { id: true, title: true, venue: true, eventDate: true, price: true },
      },
    },
  });
};

/**
 * Create a booking inside a transaction.
 * Uses SELECT FOR UPDATE to lock the event row and prevent overselling.
 *
 * Flow:
 *  1. Lock the event row (FOR UPDATE)
 *  2. Count confirmed bookings
 *  3. Reject if sold out
 *  4. Check for duplicate booking
 *  5. Create the booking
 *  6. Log BOOKING_STARTED + BOOKING_CONFIRMED
 *
 * @param {{ userId, eventId }} dto
 * @returns {Promise<object>} created booking
 */
const createBooking = async ({ userId, eventId }) => {
  return prisma.$transaction(async (tx) => {
    // 1. Lock the event row — prevents two concurrent transactions from
    //    both seeing "1 seat left" and both succeeding.
    const event = await tx.$queryRaw`
      SELECT id, capacity
      FROM "Event"
      WHERE id = ${eventId}
      FOR UPDATE
    `;

    if (!event || event.length === 0) {
      const err = new Error('Event not found.');
      err.statusCode = 404;
      throw err;
    }

    // 2. Count current confirmed bookings (within the same transaction)
    const confirmedCount = await tx.booking.count({
      where: { eventId, status: BOOKING_STATUS.CONFIRMED },
    });

    // 3. Reject if sold out
    if (confirmedCount >= event[0].capacity) {
      const err = new Error('Sorry, this event is sold out.');
      err.statusCode = 409;
      throw err;
    }

    // 4. Check for duplicate — same user can't book the same event twice
    const existing = await tx.booking.findUnique({
      where: { userId_eventId: { userId, eventId } },
    });

    if (existing && existing.status === BOOKING_STATUS.CONFIRMED) {
      const err = new Error('You have already booked this event.');
      err.statusCode = 409;
      throw err;
    }

    // 5. Create the booking (or re-confirm a previously cancelled one)
    let booking;
    if (existing && existing.status === BOOKING_STATUS.CANCELLED) {
      // Allow re-booking after cancellation
      booking = await tx.booking.update({
        where: { id: existing.id },
        data: { status: BOOKING_STATUS.CONFIRMED, cancelledAt: null },
      });
    } else {
      booking = await tx.booking.create({
        data: { userId, eventId, status: BOOKING_STATUS.CONFIRMED },
      });
    }

    // 6. Log activities
    await tx.activityLog.createMany({
      data: [
        { activityType: 'BOOKING_STARTED',   userId, eventId },
        { activityType: 'BOOKING_CONFIRMED', userId, eventId },
      ],
    });

    return booking;
  });
};

/**
 * Cancel a booking — sets status to CANCELLED.
 * @param {string} bookingId
 * @param {string} userId - for logging
 */
const cancelBooking = async (bookingId, userId) => {
  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.update({
      where: { id: bookingId },
      data:  { status: BOOKING_STATUS.CANCELLED, cancelledAt: new Date() },
    });

    await tx.activityLog.create({
      data: { activityType: 'BOOKING_CANCELLED', userId, eventId: booking.eventId },
    });

    return booking;
  });
};

module.exports = { findById, findActiveBooking, findByUser, createBooking, cancelBooking };
