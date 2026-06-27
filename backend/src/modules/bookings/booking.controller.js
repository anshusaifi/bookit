// src/modules/bookings/booking.controller.js
// Thin controller — calls service, sends response or delegates errors.

const bookingService     = require('./booking.service');
const { sendSuccess }    = require('../../utils/response');
const { HTTP_STATUS }    = require('../../config/constants');

const bookEvent = async (req, res, next) => {
  try {
    const booking = await bookingService.bookEvent({
      userId:  req.user.id,
      eventId: req.params.id,
    });
    return sendSuccess(res, { booking }, HTTP_STATUS.CREATED);
  } catch (err) {
    next(err);
  }
};

const getMyBookings = async (req, res, next) => {
  try {
    const bookings = await bookingService.getMyBookings(req.user.id);
    return sendSuccess(res, { bookings });
  } catch (err) {
    next(err);
  }
};

const cancelBooking = async (req, res, next) => {
  try {
    const booking = await bookingService.cancelBooking({
      bookingId: req.params.id,
      userId:    req.user.id,
    });
    return sendSuccess(res, { booking });
  } catch (err) {
    next(err);
  }
};

module.exports = { bookEvent, getMyBookings, cancelBooking };
