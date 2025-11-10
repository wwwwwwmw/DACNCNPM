const { Room } = require('../../models');

async function listRooms(req, res) {
  try {
    const list = await Room.findAll();
    return res.json(list);
  } catch (e) { return res.status(500).json({ message: e.message }); }
}

async function createRoom(req, res) {
  try {
    const { name, location, capacity } = req.body;
    if (!name) return res.status(400).json({ message: 'Missing name' });
    const room = await Room.create({ name, location, capacity });
    return res.status(201).json(room);
  } catch (e) { return res.status(500).json({ message: e.message }); }
}

async function updateRoom(req, res) {
  try {
    const { name, location, capacity } = req.body;
    const room = await Room.findByPk(req.params.id);
    if (!room) return res.status(404).json({ message: 'Not found' });
    if (name) room.name = name;
    if (typeof location !== 'undefined') room.location = location;
    if (typeof capacity !== 'undefined') room.capacity = capacity;
    await room.save();
    return res.json(room);
  } catch (e) { return res.status(500).json({ message: e.message }); }
}

async function deleteRoom(req, res) {
  try {
    const room = await Room.findByPk(req.params.id);
    if (!room) return res.status(404).json({ message: 'Not found' });
    await room.destroy();
    return res.json({ message: 'Deleted' });
  } catch (e) { return res.status(500).json({ message: e.message }); }
}

module.exports = { listRooms, createRoom, updateRoom, deleteRoom };
