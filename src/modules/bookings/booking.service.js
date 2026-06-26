// src/modules/bookings/booking.service.js
// Business logic for booking and cancellation.

const bookingRepo        = require('./booking.repository');
const eventRepo          = require('../events/event.repository');
const { BOOKING_STATUS } = require('../../config/constants');

/**
 * Book a seat on an event.
 * Concurrency safety is enforced in the repository via SELECT FOR UPDATE.
 */
const bookEvent = async ({ userId, eventId }) => {
  // Verify event exists first — gives a clean 404 before hitting the transaction
  const event = await eventRepo.findById(eventId);
  if (!event) {
    const err = new Error('Event not found.');
    err.statusCode = 404;
    throw err;
  }

  const booking = await bookingRepo.createBooking({ userId, eventId });
  return booking;
};

/**
 * Get all bookings for the logged-in user.
 */
const getMyBookings = async (userId) => {
  return bookingRepo.findByUser(userId);
};

/**
 * Cancel a booking. Only the owner can cancel.
 */
const cancelBooking = async ({ bookingId, userId }) => {
  const booking = await bookingRepo.findById(bookingId);

  if (!booking) {
    const err = new Error('Booking not found.');
    err.statusCode = 404;
    throw err;
  }

  if (booking.userId !== userId) {
    const err = new Error('You are not allowed to cancel this booking.');
    err.statusCode = 403;
    throw err;
  }

  if (booking.status === BOOKING_STATUS.CANCELLED) {
    const err = new Error('This booking is already cancelled.');
    err.statusCode = 409;
    throw err;
  }

  return bookingRepo.cancelBooking(bookingId, userId);
};

module.exports = { bookEvent, getMyBookings, cancelBooking };
