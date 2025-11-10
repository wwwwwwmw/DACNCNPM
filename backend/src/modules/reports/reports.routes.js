const express = require('express');
const router = express.Router();
const { eventsByMonth, eventsByDepartment } = require('./reports.controller');

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

module.exports = router;
