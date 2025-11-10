const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth.middleware');
const { requireRole } = require('../../middleware/role.middleware');
const { listRooms, createRoom, updateRoom, deleteRoom } = require('./room.controller');

/**
 * @swagger
 * tags:
 *   name: Rooms
 *   description: Quản lý phòng họp
 */

router.get('/', listRooms);

router.use(auth, requireRole('admin'));
router.post('/', createRoom);
router.put('/:id', updateRoom);
router.delete('/:id', deleteRoom);

module.exports = router;
