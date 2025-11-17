const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth.middleware');
const maybeAuth = require('../../middleware/maybe_auth.middleware');
const { listEvents, getEvent, createEvent, updateEvent, deleteEvent, downloadICS } = require('./event.controller');
const { query, body } = require('express-validator');
const { validate } = require('../../middleware/validate.middleware');
/**
 * @swagger
 * tags:
 *   name: Events
 *   description: Quản lý lịch công tác
 */

// Populate req.user if token is present; otherwise treat as public access
router.get('/', maybeAuth, listEvents);
router.get('/:id', getEvent);
router.get('/:id/ics', downloadICS);

router.use(auth);
router.post('/',
  validate([
    body('title').isString().notEmpty(),
    body('start_time').isISO8601(),
    body('end_time').isISO8601()
  ]),
  createEvent
);
router.put('/:id', updateEvent);
router.delete('/:id', deleteEvent);

/**
 * @swagger
 * /api/events:
 *   get:
 *     tags: [Events]
 *     summary: Danh sách lịch (có lọc/phân trang)
 *     parameters:
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [pending, approved, rejected, completed] }
 *       - in: query
 *         name: roomId
 *         schema: { type: string }
 *       - in: query
 *         name: createdById
 *         schema: { type: string }
 *       - in: query
 *         name: departmentId
 *         schema: { type: string }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *       - in: query
 *         name: offset
 *         schema: { type: integer }
 */

module.exports = router;
