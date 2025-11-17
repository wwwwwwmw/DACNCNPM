const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth.middleware');
const { requireRole } = require('../../middleware/role.middleware');
const { createBackup, restoreBackup } = require('./backup.controller');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

/**
 * @swagger
 * tags:
 *   name: Backup
 *   description: Sao lưu cơ sở dữ liệu
 */

router.use(auth);

/**
 * @swagger
 * /api/backup/create:
 *   get:
 *     tags: [Backup]
 *     summary: Tạo file sao lưu CSDL dạng JSON (admin-only)
 *     responses:
 *       200:
 *         description: File backup JSON trả về
 */
router.get('/create', requireRole('admin'), createBackup);

/**
 * @swagger
 * /api/backup/restore:
 *   post:
 *     tags: [Backup]
 *     summary: Phục hồi dữ liệu từ file JSON backup (admin-only)
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200: { description: OK }
 */
router.post('/restore', requireRole('admin'), upload.single('file'), restoreBackup);

module.exports = router;
