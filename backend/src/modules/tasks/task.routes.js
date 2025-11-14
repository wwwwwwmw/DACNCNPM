const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth.middleware');
const { listTasks, createTask, updateTask, deleteTask, stats, applyTask, assignTask, acceptTask, updateProgress, rejectTask } = require('./task.controller');

router.use(auth);

router.get('/', listTasks);
router.post('/', createTask);
router.get('/stats/summary', stats);
router.post('/:id/apply', applyTask);
router.post('/:id/assign', assignTask);
router.post('/:id/accept', acceptTask);
router.post('/:id/reject', rejectTask);
router.put('/:id/progress', updateProgress);
router.put('/:id', updateTask);
router.delete('/:id', deleteTask);

module.exports = router;
