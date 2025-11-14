const express = require('express');
const router = express.Router();

router.use('/auth', require('./auth/auth.routes'));
router.use('/users', require('./users/user.routes'));
router.use('/departments', require('./departments/department.routes'));
router.use('/rooms', require('./rooms/room.routes'));
router.use('/events', require('./events/event.routes'));
router.use('/participants', require('./participants/participant.routes'));
router.use('/notifications', require('./notifications/notification.routes'));
router.use('/reports', require('./reports/reports.routes'));
router.use('/tasks', require('./tasks/task.routes'));
router.use('/projects', require('./projects/project.routes'));
router.use('/labels', require('./labels/label.routes'));

module.exports = router;
