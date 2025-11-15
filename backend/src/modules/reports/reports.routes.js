const express = require('express');
const router = express.Router();
const { eventsByMonth, eventsByDepartment, exportEventsCsv } = require('./reports.controller');
const auth = require('../../middleware/auth.middleware');
const { requireRole } = require('../../middleware/role.middleware');

/**
 * @swagger
 * tags:
 *   name: Reports
 *   description: Thống kê & Báo cáo
 */

/**
 * @swagger
 * /api/reports/eventsByMonth:
 *   get:
 *     tags: [Reports]
 *     summary: Thống kê lịch theo tháng
 *     parameters:
 *       - in: query
 *         name: year
 *         schema: { type: integer }
 */
router.get('/eventsByMonth', eventsByMonth);

/**
 * @swagger
 * /api/reports/eventsByDepartment:
 *   get:
 *     tags: [Reports]
 *     summary: Thống kê lịch theo phòng ban
 */
router.get('/eventsByDepartment', eventsByDepartment);

/**
 * @swagger
 * /api/reports/export/events:
 *   get:
 *     tags: [Reports]
 *     summary: Xuất CSV danh sách lịch công tác
 *     parameters:
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date-time }
 */
router.get('/export/events', auth, requireRole('admin','manager'), exportEventsCsv);

module.exports = router;
