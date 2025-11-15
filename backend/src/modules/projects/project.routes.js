const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth.middleware');
const { listProjects, createProject, updateProject, deleteProject } = require('./project.controller');

router.use(auth);
router.get('/', listProjects);
const { requireRole } = require('../../middleware/role.middleware');
router.post('/', requireRole('admin','manager'), createProject);
router.put('/:id', requireRole('admin','manager'), updateProject);
router.delete('/:id', requireRole('admin','manager'), deleteProject);

module.exports = router;
