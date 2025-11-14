const { Task, Project, Label, TaskAssignment, User, Participant, Event } = require('../../models');
const { getIO } = require('../../utils/socket');
const { Op } = require('sequelize');

async function listTasks(req, res) {
  try {
    const { id, status, projectId, from, to, limit = 100, offset = 0, scope } = req.query;
    const where = {};
    if (id) where.id = id;
    if (status) where.status = status;
    if (projectId) where.projectId = projectId;
    if (from || to) {
      where.start_time = {};
      if (from) where.start_time[Op.gte] = new Date(from);
      if (to) where.start_time[Op.lte] = new Date(to);
    }
    // Managers default to department scope unless scope=all explicitly
    if (req.user?.role === 'manager' && scope !== 'all') {
      where.departmentId = req.user.departmentId || null;
    }
    const include = [
      Project,
      { model: Label },
    ];
    if (req.user?.role === 'employee' && scope !== 'all') {
      include.push({ model: TaskAssignment, as: 'assignments', required: true, where: { userId: req.user.id }, include: [{ model: User, attributes: ['id','name'] }] });
    } else {
      include.push({ model: TaskAssignment, as: 'assignments', include: [{ model: User, attributes: ['id','name'] }] });
    }
    const tasks = await Task.findAll({
      where,
      include,
      limit: Math.min(Number(limit) || 100, 500),
      offset: Number(offset) || 0,
      order: [['created_at','DESC']]
    });
    return res.json(tasks);
  } catch (e) { return res.status(500).json({ message: e.message }); }
}

async function createTask(req, res) {
  try {
    const { title, description, start_time, end_time, status, projectId, priority, labelIds = [], assignment_type = 'open', capacity = 1, departmentId } = req.body;
    if (!title) return res.status(400).json({ message: 'Missing title' });
    if (req.user.role === 'manager' && departmentId && String(departmentId) !== String(req.user.departmentId)) {
      return res.status(403).json({ message: 'Cannot create task for another department' });
    }
    const task = await Task.create({ title, description, start_time, end_time, status: status || 'todo', projectId: projectId || null, createdById: req.user.id, priority: priority || 'normal', assignment_type, capacity, departmentId: departmentId || req.user.departmentId || null });
    if (Array.isArray(labelIds) && labelIds.length) {
      await task.setLabels(labelIds);
    }
  const created = await Task.findByPk(task.id, { include: [Project, { model: Label }, { model: TaskAssignment, as: 'assignments' }] });
  try { getIO().emit('dataUpdated', { resource: 'tasks', action: 'create', id: created.id }); } catch (_) {}
    return res.status(201).json(created);
  } catch (e) { return res.status(500).json({ message: e.message }); }
}

async function updateTask(req, res) {
  try {
    const task = await Task.findByPk(req.params.id);
    if (!task) return res.status(404).json({ message: 'Not found' });
    if (String(task.createdById) !== String(req.user.id) && req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    const { title, description, start_time, end_time, status, projectId, priority, labelIds, assignment_type, capacity } = req.body;
    if (title) task.title = title;
    if (typeof description !== 'undefined') task.description = description;
    if (start_time) task.start_time = start_time;
    if (end_time) task.end_time = end_time;
    if (status) task.status = status;
    if (typeof projectId !== 'undefined') task.projectId = projectId;
    if (priority) task.priority = priority;
    if (assignment_type) task.assignment_type = assignment_type;
    if (typeof capacity !== 'undefined') task.capacity = capacity;
    await task.save();
    if (Array.isArray(labelIds)) await task.setLabels(labelIds);
  const updated = await Task.findByPk(task.id, { include: [Project, { model: Label }, { model: TaskAssignment, as: 'assignments' }] });
  try { getIO().emit('dataUpdated', { resource: 'tasks', action: 'update', id: updated.id }); } catch (_) {}
    return res.json(updated);
  } catch (e) { return res.status(500).json({ message: e.message }); }
}

async function deleteTask(req, res) {
  try {
    const task = await Task.findByPk(req.params.id);
    if (!task) return res.status(404).json({ message: 'Not found' });
    if (String(task.createdById) !== String(req.user.id) && req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
  await task.destroy();
  try { getIO().emit('dataUpdated', { resource: 'tasks', action: 'delete', id: task.id }); } catch (_) {}
    return res.json({ message: 'Deleted' });
  } catch (e) { return res.status(500).json({ message: e.message }); }
}

async function stats(req, res) {
  try {
    const where = {};
    const scope = req.query.scope || (req.user.role === 'admin' ? 'all' : req.user.role === 'manager' ? 'department' : 'me');
    if (scope === 'department' && req.user.departmentId) {
      where.departmentId = req.user.departmentId;
    }
    if (scope === 'me') {
      const assigns = await TaskAssignment.findAll({ where: { userId: req.user.id }, attributes: ['taskId'] });
      const ids = assigns.map(a => a.taskId);
      if (!ids.length) return res.json({ todo:0,in_progress:0,completed:0 });
      where.id = ids;
    }
    const rows = await Task.findAll({ attributes: ['status', [Task.sequelize.fn('COUNT', Task.sequelize.col('id')),'count']], where, group: ['status'] });
    const map = { todo:0,in_progress:0,completed:0 };
    rows.forEach(r=> map[r.status] = Number(r.get('count')) );
    return res.json(map);
  } catch (e) { return res.status(500).json({ message: e.message }); }
}

// ===== Assignments APIs =====
async function getAcceptedCount(taskId) {
  return TaskAssignment.count({ where: { taskId, status: { [Op.in]: ['accepted','completed'] } } });
}

async function applyTask(req, res) {
  try {
    const task = await Task.findByPk(req.params.id);
    if (!task) return res.status(404).json({ message: 'Not found' });
    if (task.assignment_type !== 'open') return res.status(400).json({ message: 'Task is not open for self-apply' });
    const accepted = await getAcceptedCount(task.id);
    if (accepted >= task.capacity) return res.status(409).json({ message: 'Task is full' });
    const exists = await TaskAssignment.findOne({ where: { taskId: task.id, userId: req.user.id } });
    if (exists) return res.status(400).json({ message: 'Already applied or assigned' });
  const asg = await TaskAssignment.create({ taskId: task.id, userId: req.user.id, status: 'accepted' });
  try { getIO().emit('dataUpdated', { resource: 'tasks', action: 'assign', id: task.id }); } catch (_) {}
  return res.status(201).json(asg);
  } catch (e) { return res.status(500).json({ message: e.message }); }
}

async function assignTask(req, res) {
  try {
    if (!(req.user.role === 'manager' || req.user.role === 'admin')) return res.status(403).json({ message: 'Forbidden' });
    const task = await Task.findByPk(req.params.id);
    if (!task) return res.status(404).json({ message: 'Not found' });
    if (req.user.role === 'manager' && String(task.departmentId) !== String(req.user.departmentId)) return res.status(403).json({ message: 'Cross-department not allowed' });
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: 'Missing userId' });
    // Block assignment if user currently in an approved event timeframe
    try {
      const now = new Date();
      const busy = await Participant.findOne({
        where: { userId, status: 'accepted' },
        include: [{ model: Event, where: { start_time: { [Op.lte]: now }, end_time: { [Op.gte]: now }, status: 'approved' } }]
      });
      if (busy) return res.status(409).json({ message: 'User is currently on business/event time' });
    } catch (_) {}
    const accepted = await getAcceptedCount(task.id);
    if (accepted >= task.capacity) return res.status(409).json({ message: 'Task is full' });
    const exists = await TaskAssignment.findOne({ where: { taskId: task.id, userId } });
    if (exists) return res.status(400).json({ message: 'Already applied or assigned' });
    const status = task.assignment_type === 'direct' ? 'assigned' : 'accepted';
  const asg = await TaskAssignment.create({ taskId: task.id, userId, status });
    try { require('../notifications/notification.service').notifyUsers(userId, 'Nhiệm vụ mới', task.title, { ref_type: 'task', ref_id: task.id }); } catch (_) {}
  try { getIO().emit('dataUpdated', { resource: 'tasks', action: 'assign', id: task.id }); } catch (_) {}
  return res.status(201).json(asg);
  } catch (e) { return res.status(500).json({ message: e.message }); }
}
async function rejectTask(req, res) {
  try {
    const { reason } = req.body;
    const task = await Task.findByPk(req.params.id);
    if (!task) return res.status(404).json({ message: 'Not found' });
    const asg = await TaskAssignment.findOne({ where: { taskId: task.id, userId: req.user.id } });
    if (!asg) return res.status(404).json({ message: 'Assignment not found' });
    if (asg.status === 'completed') return res.status(400).json({ message: 'Already completed' });
    asg.status = 'rejected';
    if (reason) asg.reject_reason = String(reason).slice(0, 1000);
    await asg.save();
    // Notify managers with reason
    try {
      const mgrs = await User.findAll({ where: { role: 'manager', departmentId: task.departmentId }, attributes: ['id'] });
      const ids = mgrs.length ? mgrs.map(m => m.id) : (task.createdById ? [task.createdById] : []);
      if (ids.length) {
        const me = await User.findByPk(req.user.id, { attributes: ['name','email'] });
        const who = me?.name || me?.email || 'Một nhân viên';
        const msg = reason ? `${who} từ chối: ${task.title} — Lý do: ${reason}` : `${who} từ chối: ${task.title}`;
        await require('../notifications/notification.service').notifyUsers(ids, 'Từ chối nhiệm vụ', msg, { ref_type: 'task', ref_id: task.id });
      }
    } catch (_) {}
    try { getIO().emit('dataUpdated', { resource: 'tasks', action: 'reject', id: task.id }); } catch (_) {}
    return res.json(asg);
  } catch (e) { return res.status(500).json({ message: e.message }); }
}

async function acceptTask(req, res) {
  try {
    const task = await Task.findByPk(req.params.id);
    if (!task) return res.status(404).json({ message: 'Not found' });
    const asg = await TaskAssignment.findOne({ where: { taskId: task.id, userId: req.user.id } });
    if (!asg) return res.status(404).json({ message: 'Assignment not found' });
    if (asg.status === 'accepted' || asg.status === 'completed') return res.json(asg);
    const accepted = await getAcceptedCount(task.id);
    if (accepted >= task.capacity) return res.status(409).json({ message: 'Task is full' });
    asg.status = 'accepted';
  await asg.save();
    // Notify managers of this department (or creator as fallback)
    try {
      const mgrs = await User.findAll({ where: { role: 'manager', departmentId: task.departmentId }, attributes: ['id'] });
      const ids = mgrs.length ? mgrs.map(m => m.id) : (task.createdById ? [task.createdById] : []);
      if (ids.length) {
        const me = await User.findByPk(req.user.id, { attributes: ['name','email'] });
        const who = me?.name || me?.email || 'Một nhân viên';
        await require('../notifications/notification.service').notifyUsers(ids, 'Nhận nhiệm vụ', `${who} đã chấp nhận: ${task.title}`, { ref_type: 'task', ref_id: task.id });
      }
    } catch (_) {}
  try { getIO().emit('dataUpdated', { resource: 'tasks', action: 'accept', id: task.id }); } catch (_) {}
  return res.json(asg);
  } catch (e) { return res.status(500).json({ message: e.message }); }
}

async function updateProgress(req, res) {
  try {
    const { progress } = req.body;
    if (typeof progress !== 'number' || progress < 0 || progress > 100) return res.status(400).json({ message: 'Invalid progress' });
    const asg = await TaskAssignment.findOne({ where: { taskId: req.params.id, userId: req.user.id } });
    if (!asg) return res.status(404).json({ message: 'Assignment not found' });
    asg.progress = Math.round(progress);
    if (asg.progress >= 100) asg.status = 'completed';
  await asg.save();
    if (asg.status === 'completed') {
      // Notify managers on completion
      try {
        const task = await Task.findByPk(req.params.id);
        if (task) {
          const mgrs = await User.findAll({ where: { role: 'manager', departmentId: task.departmentId }, attributes: ['id'] });
          const ids = mgrs.length ? mgrs.map(m => m.id) : (task.createdById ? [task.createdById] : []);
          if (ids.length) {
            const me = await User.findByPk(req.user.id, { attributes: ['name','email'] });
            const who = me?.name || me?.email || 'Một nhân viên';
            await require('../notifications/notification.service').notifyUsers(ids, 'Hoàn thành nhiệm vụ', `${who} đã hoàn thành: ${task.title}`, { ref_type: 'task', ref_id: task.id });
          }
        }
      } catch (_) {}
    }
  try { getIO().emit('dataUpdated', { resource: 'tasks', action: 'progress', id: req.params.id }); } catch (_) {}
  return res.json(asg);
  } catch (e) { return res.status(500).json({ message: e.message }); }
}

module.exports = { listTasks, createTask, updateTask, deleteTask, stats, applyTask, assignTask, acceptTask, updateProgress, rejectTask };