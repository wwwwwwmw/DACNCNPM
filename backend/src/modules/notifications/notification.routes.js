const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth.middleware');
const { requireRole } = require('../../middleware/role.middleware');
const { listMyNotifications, createNotification, markRead } = require('./notification.controller');

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: Thông báo realtime
 */

router.use(auth);

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     tags: [Notifications]
 *     summary: Danh sách thông báo của tôi
 */
router.get('/', listMyNotifications);

/**
 * @swagger
 * /api/notifications:
 *   post:
 *     tags: [Notifications]
 *     summary: Gửi thông báo tới 1 người dùng (Admin)
 */
router.post('/', requireRole('admin'), createNotification);

/**
 * @swagger
 * /api/notifications/{id}/read:
 *   put:
 *     tags: [Notifications]
 *     summary: Đánh dấu đã đọc
 */
router.put('/:id/read', markRead);

module.exports = router;
