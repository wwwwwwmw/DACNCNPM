const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth.middleware');
const { listProjects, createProject, updateProject, deleteProject } = require('./project.controller');

router.use(auth);
router.get('/', listProjects);
router.post('/', createProject);
router.put('/:id', updateProject);
router.delete('/:id', deleteProject);

module.exports = router;
