const { Op } = require('sequelize');
const { Event, Participant, User, Room, Department } = require('../../models');
const { notifyUsers } = require('../notifications/notification.service');
const { eventToICS } = require('../../utils/ics');

async function listEvents(req, res) {
  try {
    // filters: ?from=&to=&status=&roomId=&createdById=&departmentId=&type=&mine&limit=&offset=
    const { from, to, status, roomId, createdById, departmentId, type, mine, limit = 200, offset = 0 } = req.query;
    const where = {};
    if (from || to) {
      where.start_time = {};
      if (from) where.start_time[Op.gte] = new Date(from);
      if (to) where.start_time[Op.lte] = new Date(to);
    }
    if (status) where.status = status;
    if (type) where.type = type;
    if (roomId) where.roomId = roomId;
    if (createdById) where.createdById = createdById;

    const include = [
      { model: Room },
      { model: User, as: 'createdBy', attributes: ['id','name','email','role','departmentId'], include: [{ model: Department, attributes: ['id','name'] }] },
      { model: Participant, include: [{ model: User, attributes: ['id','name','email'] }] },
      { model: Department, as: 'extraDepartments', attributes: ['id','name'], through: { attributes: [] } }
    ];

    if (departmentId || mine) {
      include[1].required = true;
      include[1].where = {};
      if (departmentId) include[1].where.departmentId = departmentId;
      if (mine && req.user) include[1].where.id = req.user.id;
    }

    // Visibility rules:
    // - Admin: all
    // - Manager: own department OR global
    // - Employee (authenticated non-admin/manager): own department OR global
    // - Unauthenticated: global approved only
    if (req.user) {
      if (req.user.role === 'manager' || req.user.role === 'employee') {
        const deptCond = req.user.departmentId ? { departmentId: req.user.departmentId } : { departmentId: null };
        where[Op.or] = [ deptCond, { is_global: true } ];
      }
    } else {
      where.is_global = true;
      where.status = 'approved';
    }
    const events = await Event.findAll({
      where,
      include,
      order: [['start_time','ASC']],
      limit: Math.min(Number(limit) || 200, 500),
      offset: Number(offset) || 0,
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
    const { title, description, start_time, end_time, roomId, participantIds = [], repeat, departmentId, departmentIds = [], isGlobal, status: bodyStatus, type } = req.body;
    if (!title || !start_time || !end_time) return res.status(400).json({ message: 'Missing required fields' });
    // Authorization & Department scope checks
    if (req.user.role === 'manager' && departmentId && String(departmentId) !== String(req.user.departmentId)) {
      return res.status(403).json({ message: 'Cannot create event for another department' });
    }
    if (req.user.role === 'employee' && departmentId && String(departmentId) !== String(req.user.departmentId)) {
      return res.status(403).json({ message: 'Cannot create event for another department' });
    }

    // Status rules
    let status = 'pending';
    if (req.user.role === 'admin' || req.user.role === 'manager') {
      const allowed = ['pending','approved','rejected','completed'];
      if (bodyStatus && allowed.includes(bodyStatus)) status = bodyStatus;
    } else {
      // employee must be pending regardless of body
      status = 'pending';
    }
    // Determine primary department (first of list or provided single)
    const deptList = Array.isArray(departmentIds) ? departmentIds : [];
    const primaryDept = departmentId || (deptList.length ? deptList[0] : (isGlobal ? null : req.user.departmentId));

    // Meeting room availability check
    if (type === 'meeting' && roomId) {
      const overlap = await Event.findOne({
        where: {
          roomId,
          start_time: { [Op.lt]: new Date(end_time) },
          end_time: { [Op.gt]: new Date(start_time) }
        }
      });
      if (overlap) return res.status(400).json({ message: 'Room busy for selected time' });
    }

    const event = await Event.create({
      title,
      description,
      start_time,
      end_time,
      roomId: roomId || null,
      createdById: req.user.id,
      repeat: repeat || null,
      departmentId: primaryDept || null,
      is_global: !!isGlobal,
      status,
      type: type === 'meeting' ? 'meeting' : 'work',
    });
    const parts = Array.isArray(participantIds) ? participantIds : [];
    if (parts.length) {
      await Participant.bulkCreate(parts.map(uid => ({ eventId: event.id, userId: uid })));
      await notifyUsers(parts, 'Lịch mới', `Bạn được mời tham dự: ${title}`, { ref_type: 'event', ref_id: event.id });
    }
    // Extra departments join rows
    if (deptList.length > 1) {
      const { EventDepartment } = require('../../models');
      const extra = deptList.slice(primaryDept ? 0 : 0); // take all; duplicates prevented by unique index
      await EventDepartment.bulkCreate(extra.map(did => ({ eventId: event.id, departmentId: did })));
    }
    await notifyUsers(req.user.id, 'Tạo lịch thành công', `Đã tạo: ${title}`, { ref_type: 'event', ref_id: event.id });

    // Notify department managers when pending for approval
    if (status === 'pending') {
      try {
        const mgrs = await User.findAll({ where: { role: 'manager', departmentId: event.departmentId }, attributes: ['id'] });
        const ids = mgrs.map(m => m.id);
        if (ids.length) {
          await notifyUsers(ids, 'Lịch chờ duyệt', `Có lịch mới chờ duyệt: ${event.title}`, { ref_type: 'event', ref_id: event.id });
        }
      } catch (_) {}
    }
    const created = await Event.findByPk(event.id, { include: [Room, { model: User, as: 'createdBy', attributes: ['id','name','email'] }, Participant, { model: Department, as: 'extraDepartments', attributes: ['id','name'], through: { attributes: [] } }] });
    return res.status(201).json(created);
  } catch (e) { return res.status(500).json({ message: e.message }); }
}

async function updateEvent(req, res) {
  try {
    const { title, description, start_time, end_time, roomId, status } = req.body;
    const event = await Event.findByPk(req.params.id);
    if (!event) return res.status(404).json({ message: 'Not found' });
    const isOwner = String(event.createdById) === String(req.user.id);
    const isAdmin = req.user.role === 'admin';
    let isManager = req.user.role === 'manager' && (event.is_global || String(event.departmentId) === String(req.user.departmentId));
    if (!isOwner && !(isAdmin || isManager)) return res.status(403).json({ message: 'Forbidden' });

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

    if (typeof status !== 'undefined') { // changing status
      if (!(isAdmin || isManager)) return res.status(403).json({ message: 'Only manager/admin can change status' });
      event.status = status;
    }
  await event.save();

    // Notifications on status change
    if (typeof status !== 'undefined') {
  const participants = await Participant.findAll({ where: { eventId: event.id } });
  const ids = participants.map(p => p.userId).concat([event.createdById]);
  const titleMsg = status === 'approved' ? 'Lịch được duyệt' : status === 'rejected' ? 'Lịch bị từ chối' : 'Cập nhật lịch';
  await notifyUsers(ids, titleMsg, `${event.title} - Trạng thái: ${event.status}`, { ref_type: 'event', ref_id: event.id });
    }

  const updated = await Event.findByPk(event.id, { include: [Room, { model: User, as: 'createdBy', attributes: ['id','name','email'] }, Participant] });
  try { require('../../utils/socket').getIO().emit('dataUpdated', { resource: 'events', action: 'update', id: updated.id }); } catch (_) {}
    return res.json(updated);
  } catch (e) { return res.status(500).json({ message: e.message }); }
}

async function deleteEvent(req, res) {
  try {
    const event = await Event.findByPk(req.params.id);
    if (!event) return res.status(404).json({ message: 'Not found' });
    const isOwner = String(event.createdById) === String(req.user.id);
    const canManagerDelete = req.user.role === 'manager' && (event.is_global || String(event.departmentId) === String(req.user.departmentId));
    if (!isOwner && !(req.user.role === 'admin' || canManagerDelete)) return res.status(403).json({ message: 'Forbidden' });
  await event.destroy();
  try { require('../../utils/socket').getIO().emit('dataUpdated', { resource: 'events', action: 'delete', id: event.id }); } catch (_) {}
    const participants = await Participant.findAll({ where: { eventId: req.params.id } });
    if (participants.length) await notifyUsers(participants.map(p=>p.userId), 'Lịch bị hủy', event.title);
    return res.json({ message: 'Deleted' });
  } catch (e) { return res.status(500).json({ message: e.message }); }
}

async function downloadICS(req, res) {
  try {
    const event = await Event.findByPk(req.params.id);
    if (!event) return res.status(404).json({ message: 'Not found' });
    const ics = eventToICS(event);
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="event-${event.id}.ics"`);
    res.send(ics);
  } catch (e) { return res.status(500).json({ message: e.message }); }
}

module.exports = { listEvents, getEvent, createEvent, updateEvent, deleteEvent, downloadICS };
