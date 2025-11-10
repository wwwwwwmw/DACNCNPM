const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth.middleware');
const { listParticipants, addParticipants, updateParticipant } = require('./participant.controller');

/**
 * @swagger
 * tags:
 *   name: Participants
 *   description: Quản lý người tham dự
 */

router.use(auth);

/**
 * @swagger
 * /api/participants:
 *   get:
 *     tags: [Participants]
 *     summary: Danh sách người tham dự theo eventId
 *     parameters:
 *       - in: query
 *         name: eventId
 *         schema: { type: string }
 *     responses:
 *       200: { description: OK }
 */
router.get('/', listParticipants);

/**
 * @swagger
 * /api/participants:
 *   post:
 *     tags: [Participants]
 *     summary: Gán người tham dự cho lịch
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               eventId: { type: string }
 *               userIds: { type: array, items: { type: string } }
 *     responses:
 *       201: { description: Created }
 */
router.post('/', addParticipants);

/**
 * @swagger
 * /api/participants/{id}:
 *   put:
 *     tags: [Participants]
 *     summary: Cập nhật RSVP (self)
 *     parameters:
 *       - in: path
 *         name: id
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status: { type: string, enum: [pending, accepted, declined] }
 *     responses:
 *       200: { description: OK }
 */
router.put('/:id', updateParticipant);

module.exports = router;
