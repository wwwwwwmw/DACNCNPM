const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth.middleware');
const { requireRole } = require('../../middleware/role.middleware');
const { listDepartments, createDepartment, updateDepartment, deleteDepartment } = require('./department.controller');

/**
 * @swagger
 * tags:
 *   name: Departments
 *   description: Quản lý phòng ban
 */

router.get('/', listDepartments);

router.use(auth, requireRole('admin'));

router.post('/', createDepartment);
router.put('/:id', updateDepartment);
router.delete('/:id', deleteDepartment);

module.exports = router;
