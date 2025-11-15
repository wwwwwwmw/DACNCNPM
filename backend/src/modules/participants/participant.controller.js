const { Participant, Event, User } = require('../../models');
const { notifyUsers } = require('../notifications/notification.service');

async function listParticipants(req, res) {
  try {
    const { eventId } = req.query;
    if (!eventId) return res.status(400).json({ message: 'Missing eventId' });
    const list = await Participant.findAll({ where: { eventId }, include: [{ model: User, attributes: ['id','name','email'] }] });
    return res.json(list);
  } catch (e) { return res.status(500).json({ message: e.message }); }
}

async function addParticipants(req, res) {
  try {
    const { eventId, userIds } = req.body;
    if (!eventId || !Array.isArray(userIds)) return res.status(400).json({ message: 'Missing eventId or userIds' });
    const rows = await Participant.bulkCreate(userIds.map(uid => ({ eventId, userId: uid })), { ignoreDuplicates: true });
    return res.status(201).json(rows);
  } catch (e) { return res.status(500).json({ message: e.message }); }
}

async function updateParticipant(req, res) {
  try {
    const { status } = req.body;
    const part = await Participant.findByPk(req.params.id);
    if (!part) return res.status(404).json({ message: 'Not found' });
    // Only participant self can RSVP
    if (String(part.userId) !== String(req.user.id)) return res.status(403).json({ message: 'Forbidden' });
    if (!['pending','accepted','declined'].includes(status)) return res.status(400).json({ message: 'Invalid status' });
    part.status = status;
    await part.save();
    return res.json(part);
  } catch (e) { return res.status(500).json({ message: e.message }); }
}

async function requestAdjustment(req, res) {
  try {
    const id = req.params.id;
    const { note, reason } = req.body || {};
    const text = typeof note === 'string' && note.trim().length > 0 ? note.trim() : (typeof reason === 'string' ? reason.trim() : '');
    if (!text) return res.status(400).json({ message: 'Missing note/reason' });

    const part = await Participant.findByPk(id, { include: [{ model: Event }] });
    if (!part) return res.status(404).json({ message: 'Not found' });
    if (String(part.userId) !== String(req.user.id)) return res.status(403).json({ message: 'Forbidden' });

    part.adjustment_note = text;
    await part.save();

    // Notify event creator and department managers if applicable
    const event = part.Event;
    const targets = new Set();
    if (event && event.createdById) targets.add(String(event.createdById));
    try {
      if (event && event.departmentId) {
        const mgrs = await User.findAll({ where: { role: 'manager', departmentId: event.departmentId }, attributes: ['id'] });
        mgrs.forEach(m => targets.add(String(m.id)));
      }
    } catch (_) {}

    if (targets.size > 0) {
      await notifyUsers(Array.from(targets), 'Yêu cầu điều chỉnh lịch', `Người tham dự yêu cầu điều chỉnh: ${event ? event.title : ''}`, { ref_type: 'event', ref_id: event ? event.id : null });
    }

    try { require('../../utils/socket').getIO().emit('dataUpdated', { resource: 'participants', action: 'update', id: part.id }); } catch (_) {}
    return res.json(part);
  } catch (e) { return res.status(500).json({ message: e.message }); }
}

module.exports = { listParticipants, addParticipants, updateParticipant, requestAdjustment };
