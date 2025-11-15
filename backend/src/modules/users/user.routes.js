const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth.middleware');
const { requireRole, selfOrAdmin } = require('../../middleware/role.middleware');
const { listUsers, getUser, updateUser, createUser, deleteUser } = require('./user.controller');

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
// Admin: full list; Manager: list only own department
router.get('/', async (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  if (!(req.user.role === 'admin' || req.user.role === 'manager')) return res.status(403).json({ message: 'Forbidden' });
  // ?limit=&offset=
  req.query.limit = Math.min(Number(req.query.limit)||50, 200);
  req.query.offset = Number(req.query.offset)||0;
  // Signal controller to scope
  req.query._managerDeptScope = req.user.role === 'manager' ? (req.user.departmentId || 'null') : undefined;
  next();
}, listUsers);
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
// Admin only create/delete
// Admin create any user; Manager create only employees within own department
router.post('/', createUser);
router.delete('/:id', requireRole('admin'), deleteUser);

module.exports = router;
