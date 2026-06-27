// src/config/constants.js
// Central place for all magic strings and shared constants.
// Import from here — never hardcode strings across the codebase.

const ROLES = Object.freeze({
  USER:      'USER',
  ORGANIZER: 'ORGANIZER',
});

const BOOKING_STATUS = Object.freeze({
  CONFIRMED: 'CONFIRMED',
  CANCELLED: 'CANCELLED',
});

const ACTIVITY_TYPE = Object.freeze({
  EVENT_VIEWED:       'EVENT_VIEWED',
  BOOKING_STARTED:    'BOOKING_STARTED',
  BOOKING_CONFIRMED:  'BOOKING_CONFIRMED',
  BOOKING_CANCELLED:  'BOOKING_CANCELLED',
});

const HTTP_STATUS = Object.freeze({
  OK:                    200,
  CREATED:               201,
  NO_CONTENT:            204,
  BAD_REQUEST:           400,
  UNAUTHORIZED:          401,
  FORBIDDEN:             403,
  NOT_FOUND:             404,
  CONFLICT:              409,
  UNPROCESSABLE_ENTITY:  422,
  INTERNAL_SERVER_ERROR: 500,
});

const JWT_EXPIRES_IN = '7d';

module.exports = {
  ROLES,
  BOOKING_STATUS,
  ACTIVITY_TYPE,
  HTTP_STATUS,
  JWT_EXPIRES_IN,
};
