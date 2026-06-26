// src/modules/events/event.controller.js
// Thin controller — calls service, sends response or delegates to errorHandler.

const eventService = require('./event.service');
const { sendSuccess } = require('../../utils/response');

const DEFAULT_PAGE  = 1;
const DEFAULT_LIMIT = 10;

const listEvents = async (req, res, next) => {
  try {
    const page   = req.query.page  || DEFAULT_PAGE;
    const limit  = req.query.limit || DEFAULT_LIMIT;
    const search = req.query.search || undefined;
    const date   = req.query.date   || undefined;

    const result = await eventService.listEvents({ search, date, page, limit });
    return sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
};

const getEventById = async (req, res, next) => {
  try {
    // req.user is available only on authenticated routes.
    // For public access, pass null to allow anonymous activity logging.
    const userId = req.user?.id ?? null;
    const event  = await eventService.getEventById(req.params.id, userId);
    return sendSuccess(res, { event });
  } catch (err) {
    next(err);
  }
};

module.exports = { listEvents, getEventById };
