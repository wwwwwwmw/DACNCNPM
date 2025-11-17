const { sequelize, Event, User, Department, Participant } = require('../../models');
const { Op } = require('sequelize');

async function eventsByMonth(req, res) {
  try {
    const year = req.query.year ? Number(req.query.year) : undefined;
    const { from, to, status, type, departmentId } = req.query;
    const where = {};
    if (from || to || year) {
      where.start_time = {};
      if (year) {
        const start = new Date(year, 0, 1);
        const end = new Date(year + 1, 0, 1);
        where.start_time[Op.gte] = start;
        where.start_time[Op.lt] = end;
      }
      if (from) where.start_time[Op.gte] = new Date(from);
      if (to) where.start_time[Op.lt] = new Date(to);
    }
    if (status) where.status = status;
    if (type) where.type = type;

    const include = [];
    if (departmentId) {
      include.push({ model: User, as: 'createdBy', required: true, attributes: [], include: [{ model: Department, attributes: [] }], where: { departmentId } });
    }
    const rows = await Event.findAll({
      attributes: [
        [sequelize.fn('date_part', 'month', sequelize.col('start_time')), 'month'],
        [sequelize.fn('count', sequelize.col('id')), 'count']
      ],
      where,
      include,
      group: [sequelize.fn('date_part', 'month', sequelize.col('start_time'))],
      order: [[sequelize.literal('month'), 'ASC']],
      raw: true,
    });
    return res.json(rows);
  } catch (e) { return res.status(500).json({ message: e.message }); }
}

async function eventsByDepartment(req, res) {
  try {
    const { from, to, status, type } = req.query;
    const where = {};
    if (from || to) {
      where.start_time = {};
      if (from) where.start_time[Op.gte] = new Date(from);
      if (to) where.start_time[Op.lte] = new Date(to);
    }
    if (status) where.status = status;
    if (type) where.type = type;

    // Use the path alias used by Sequelize for nested include columns: createdBy->Department.name
    const deptPath = sequelize.col('createdBy->Department.name');
    const rows = await Event.findAll({
      attributes: [
        [deptPath, 'department'],
        [sequelize.fn('count', sequelize.col('Event.id')), 'count']
      ],
      where,
      include: [{ model: User, as: 'createdBy', attributes: [], include: [{ model: Department, attributes: [] }] }],
      group: [deptPath],
      raw: true,
    });
    return res.json(rows);
  } catch (e) { return res.status(500).json({ message: e.message }); }
}

module.exports = { eventsByMonth, eventsByDepartment };
/**
 * Xuất CSV danh sách Events
 * GET /api/reports/export/events?from=YYYY-MM-DD&to=YYYY-MM-DD
 */
async function exportEventsCsv(req, res) {
  try {
    const { from, to, status, type, departmentId } = req.query;
    const where = {};
    if (from || to) {
      where.start_time = {};
      if (from) where.start_time[Op.gte] = new Date(from);
      if (to) where.start_time[Op.lte] = new Date(to);
    }
    if (status) where.status = status;
    if (type) where.type = type;
    const rows = await Event.findAll({
      where,
      include: [
        { model: User, as: 'createdBy', attributes: ['id','name','email','role'], where: departmentId ? { departmentId } : undefined },
        { model: Department, attributes: ['id','name'] },
        { model: Participant, include: [{ model: User, attributes: ['id','name','email'] }] },
      ],
      order: [['start_time','ASC']],
    });

    // Build CSV header
    const header = [
      'id','title','description','start_time','end_time','status','roomId','is_global','department_id','department_name','created_by_id','created_by_name','created_by_email','participants'
    ];
    // CSV escape
    const esc = (val) => {
      if (val === null || val === undefined) return '';
      let s = String(val);
      if (s.includes('"')) s = s.replace(/"/g, '""');
      if (/[",\r\n]/.test(s)) s = '"' + s + '"';
      return s;
    };

    const lines = [header.join(',')];
    for (const ev of rows) {
      const participants = (ev.Participants || []).map(p => {
        const u = p.User; return u ? `${u.name||''}<${u.email||''}>` : '';
      }).filter(Boolean).join('; ');
      const dep = ev.Department;
      const cr = ev.createdBy;
      const line = [
        ev.id,
        ev.title,
        ev.description || '',
        ev.start_time ? new Date(ev.start_time).toISOString() : '',
        ev.end_time ? new Date(ev.end_time).toISOString() : '',
        ev.status,
        ev.roomId || '',
        ev.is_global ? 'true' : 'false',
        dep ? dep.id : '',
        dep ? dep.name : '',
        cr ? cr.id : '',
        cr ? (cr.name || '') : '',
        cr ? (cr.email || '') : '',
        participants,
      ].map(esc).join(',');
      lines.push(line);
    }
    const csvContent = lines.join('\n');
    // Add UTF-8 BOM so Excel displays Vietnamese correctly
    const bom = '\ufeff';
    const now = new Date();
    const pad = (n) => String(n).padStart(2,'0');
    let name = `events_${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.csv`;
    if (from || to) {
      const fmt = (d) => `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}`;
      const fromStr = from ? fmt(new Date(from)) : '...';
      const toStr = to ? fmt(new Date(to)) : '...';
      name = `events_${fromStr}-${toStr}.csv`;
    }
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${name}"`);
    return res.send(bom + csvContent);
  } catch (e) { return res.status(500).json({ message: e.message }); }
}

module.exports.exportEventsCsv = exportEventsCsv;
