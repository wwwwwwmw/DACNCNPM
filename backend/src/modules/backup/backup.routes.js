const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth.middleware');
const { requireRole } = require('../../middleware/role.middleware');
const { createBackup } = require('./backup.controller');

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
 *     summary: Tạo file sao lưu CSDL (admin-only)
 *     responses:
 *       200:
 *         description: File backup trả về
 */
router.get('/create', requireRole('admin'), createBackup);

module.exports = router;
