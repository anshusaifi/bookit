// src/modules/organizer/organizer.service.js
// Business logic for organizer operations.

const organizerRepo = require('./organizer.repository');

/**
 * Create a new event owned by this organizer.
 */
const createEvent = async ({ organizerId, title, description, venue, eventDate, capacity, price }) => {
  return organizerRepo.createEvent({ organizerId, title, description, venue, eventDate: new Date(eventDate), capacity, price });
};

/**
 * Edit an event.
 * Rules:
 *  - Only the owning organizer can edit.
 *  - Capacity cannot drop below seats already confirmed.
 */
const editEvent = async ({ eventId, organizerId, updates }) => {
  const event = await organizerRepo.findEventById(eventId);

  if (!event) {
    const err = new Error('Event not found.');
    err.statusCode = 404;
    throw err;
  }

  if (event.organizerId !== organizerId) {
    const err = new Error('You do not own this event.');
    err.statusCode = 403;
    throw err;
  }

  // If capacity is being reduced, check it won't go below already-booked count
  if (updates.capacity !== undefined) {
    const { PrismaClient } = require('@prisma/client');
    const prisma = require('../../config/prisma');

    const confirmedCount = await prisma.booking.count({
      where: { eventId, status: 'CONFIRMED' },
    });

    if (updates.capacity < confirmedCount) {
      const err = new Error(
        `Capacity cannot be less than the number of confirmed bookings (${confirmedCount}).`
      );
      err.statusCode = 409;
      throw err;
    }
  }

  // Convert eventDate string to Date if provided
  if (updates.eventDate) {
    updates.eventDate = new Date(updates.eventDate);
  }

  return organizerRepo.updateEvent(eventId, updates);
};

/**
 * Get all events for this organizer with booking counts.
 */
const getMyEvents = async (organizerId) => {
  const events = await organizerRepo.findEventsByOrganizer(organizerId);
  return events.map((e) => ({
    id:           e.id,
    title:        e.title,
    venue:        e.venue,
    eventDate:    e.eventDate,
    capacity:     e.capacity,
    price:        e.price,
    bookingsSold: e._count.bookings,
    remainingSeats: e.capacity - e._count.bookings,
  }));
};

/**
 * Get confirmed attendees for an event.
 */
const getAttendees = async ({ eventId, organizerId }) => {
  const event = await organizerRepo.findEventById(eventId);

  if (!event) {
    const err = new Error('Event not found.');
    err.statusCode = 404;
    throw err;
  }

  if (event.organizerId !== organizerId) {
    const err = new Error('You do not own this event.');
    err.statusCode = 403;
    throw err;
  }

  return organizerRepo.findAttendees(eventId);
};

/**
 * Get analytics for an event.
 */
const getAnalytics = async ({ eventId, organizerId }) => {
  const event = await organizerRepo.findEventById(eventId);

  if (!event) {
    const err = new Error('Event not found.');
    err.statusCode = 404;
    throw err;
  }

  if (event.organizerId !== organizerId) {
    const err = new Error('You do not own this event.');
    err.statusCode = 403;
    throw err;
  }

  return organizerRepo.getAnalytics(eventId);
};

module.exports = { createEvent, editEvent, getMyEvents, getAttendees, getAnalytics };
