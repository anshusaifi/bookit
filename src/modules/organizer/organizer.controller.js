// src/modules/organizer/organizer.controller.js

const organizerService = require('./organizer.service');
const { sendSuccess }  = require('../../utils/response');
const { HTTP_STATUS }  = require('../../config/constants');

const createEvent = async (req, res, next) => {
  try {
    const event = await organizerService.createEvent({
      organizerId: req.user.id,
      ...req.body,
    });
    return sendSuccess(res, { event }, HTTP_STATUS.CREATED);
  } catch (err) {
    next(err);
  }
};

const editEvent = async (req, res, next) => {
  try {
    const event = await organizerService.editEvent({
      eventId:     req.params.id,
      organizerId: req.user.id,
      updates:     req.body,
    });
    return sendSuccess(res, { event });
  } catch (err) {
    next(err);
  }
};

const getMyEvents = async (req, res, next) => {
  try {
    const events = await organizerService.getMyEvents(req.user.id);
    return sendSuccess(res, { events });
  } catch (err) {
    next(err);
  }
};

const getAttendees = async (req, res, next) => {
  try {
    const attendees = await organizerService.getAttendees({
      eventId:     req.params.id,
      organizerId: req.user.id,
    });
    return sendSuccess(res, { attendees });
  } catch (err) {
    next(err);
  }
};

const getAnalytics = async (req, res, next) => {
  try {
    const analytics = await organizerService.getAnalytics({
      eventId:     req.params.id,
      organizerId: req.user.id,
    });
    return sendSuccess(res, { analytics });
  } catch (err) {
    next(err);
  }
};

module.exports = { createEvent, editEvent, getMyEvents, getAttendees, getAnalytics };
