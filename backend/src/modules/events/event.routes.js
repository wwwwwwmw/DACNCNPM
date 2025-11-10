const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth.middleware');
const { listEvents, getEvent, createEvent, updateEvent, deleteEvent } = require('./event.controller');

/**
 * @swagger
 * tags:
 *   name: Events
 *   description: Quản lý lịch công tác
 */

router.get('/', listEvents);
router.get('/:id', getEvent);

router.use(auth);
router.post('/', createEvent);
router.put('/:id', updateEvent);
router.delete('/:id', deleteEvent);

module.exports = router;
