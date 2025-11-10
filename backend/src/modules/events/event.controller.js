const { Event, Participant, User, Room } = require('../../models');
const { notifyUsers } = require('../notifications/notification.service');

async function listEvents(req, res) {
  try {
    const events = await Event.findAll({
      include: [
        { model: Room },
        { model: User, as: 'createdBy', attributes: ['id','name','email','role','departmentId'] },
        { model: Participant, include: [{ model: User, attributes: ['id','name','email'] }] }
      ],
      order: [['start_time','ASC']]
    });
    return res.json(events);
  } catch (e) { return res.status(500).json({ message: e.message }); }
}

async function getEvent(req, res) {
  try {
    const event = await Event.findByPk(req.params.id, {
      include: [
        { model: Room },
        { model: User, as: 'createdBy', attributes: ['id','name','email','role','departmentId'] },
        { model: Participant, include: [{ model: User, attributes: ['id','name','email'] }] }
      ]
    });
    if (!event) return res.status(404).json({ message: 'Not found' });
    return res.json(event);
  } catch (e) { return res.status(500).json({ message: e.message }); }
}

async function createEvent(req, res) {
  try {
    const { title, description, start_time, end_time, roomId, participantIds = [], repeat } = req.body;
    if (!title || !start_time || !end_time) return res.status(400).json({ message: 'Missing required fields' });
    const event = await Event.create({ title, description, start_time, end_time, roomId: roomId || null, createdById: req.user.id, repeat: repeat || null });
    const parts = Array.isArray(participantIds) ? participantIds : [];
    if (parts.length) {
      await Participant.bulkCreate(parts.map(uid => ({ eventId: event.id, userId: uid })));
      await notifyUsers(parts, 'Lịch mới', `Bạn được mời tham dự: ${title}`);
    }
    await notifyUsers(req.user.id, 'Tạo lịch thành công', `Đã tạo: ${title}`);
    const created = await Event.findByPk(event.id, { include: [Room, { model: User, as: 'createdBy', attributes: ['id','name','email'] }, Participant] });
    return res.status(201).json(created);
  } catch (e) { return res.status(500).json({ message: e.message }); }
}

async function updateEvent(req, res) {
  try {
    const { title, description, start_time, end_time, roomId, status } = req.body;
    const event = await Event.findByPk(req.params.id);
    if (!event) return res.status(404).json({ message: 'Not found' });
    const isOwner = String(event.createdById) === String(req.user.id);
    const isManager = req.user.role === 'manager' || req.user.role === 'admin';
    if (!isOwner && !isManager) return res.status(403).json({ message: 'Forbidden' });

    // Owner can edit core fields only when pending; Managers can change status
    if (isOwner) {
      if (event.status !== 'pending' && (title || description || start_time || end_time || roomId)) {
        return res.status(400).json({ message: 'Cannot edit event details after approval stage' });
      }
    }
    if (title) event.title = title;
    if (typeof description !== 'undefined') event.description = description;
    if (start_time) event.start_time = start_time;
    if (end_time) event.end_time = end_time;
    if (typeof roomId !== 'undefined') event.roomId = roomId;

    if (typeof status !== 'undefined') {
      if (!isManager) return res.status(403).json({ message: 'Only manager/admin can change status' });
      event.status = status;
    }
    await event.save();

    // Notifications on status change
    if (typeof status !== 'undefined') {
      const participants = await Participant.findAll({ where: { eventId: event.id } });
      const ids = participants.map(p => p.userId).concat([event.createdById]);
      const titleMsg = status === 'approved' ? 'Lịch được duyệt' : status === 'rejected' ? 'Lịch bị từ chối' : 'Cập nhật lịch';
      await notifyUsers(ids, titleMsg, `${event.title} - Trạng thái: ${event.status}`);
    }

    const updated = await Event.findByPk(event.id, { include: [Room, { model: User, as: 'createdBy', attributes: ['id','name','email'] }, Participant] });
    return res.json(updated);
  } catch (e) { return res.status(500).json({ message: e.message }); }
}

async function deleteEvent(req, res) {
  try {
    const event = await Event.findByPk(req.params.id);
    if (!event) return res.status(404).json({ message: 'Not found' });
    const isOwner = String(event.createdById) === String(req.user.id);
    if (!isOwner && req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    await event.destroy();
    const participants = await Participant.findAll({ where: { eventId: req.params.id } });
    if (participants.length) await notifyUsers(participants.map(p=>p.userId), 'Lịch bị hủy', event.title);
    return res.json({ message: 'Deleted' });
  } catch (e) { return res.status(500).json({ message: e.message }); }
}

module.exports = { listEvents, getEvent, createEvent, updateEvent, deleteEvent };
