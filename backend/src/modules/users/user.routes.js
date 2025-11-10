const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth.middleware');
const { requireRole, selfOrAdmin } = require('../../middleware/role.middleware');
const { listUsers, getUser, updateUser } = require('./user.controller');

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: Quản lý người dùng
 */

router.use(auth);

/**
 * @swagger
 * /api/users:
 *   get:
 *     tags: [Users]
 *     summary: Danh sách người dùng (Admin)
 *     responses:
 *       200: { description: OK }
 */
router.get('/', requireRole('admin'), listUsers);

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Lấy thông tin 1 người dùng (self/admin)
 *     parameters:
 *       - in: path
 *         name: id
 *         schema: { type: string }
 *     responses:
 *       200: { description: OK }
 */
router.get('/:id', selfOrAdmin('id'), getUser);

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     tags: [Users]
 *     summary: Cập nhật thông tin (self/admin)
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
 *               name: { type: string }
 *               departmentId: { type: string }
 *               password: { type: string }
 *     responses:
 *       200: { description: OK }
 */
router.put('/:id', selfOrAdmin('id'), updateUser);

module.exports = router;
