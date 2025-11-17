const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { sequelize, Department, User, Room, Event, Participant, Notification, Project, Task, Label, TaskLabel, TaskAssignment, TaskComment, EventDepartment } = require('../../models');

function timestampName() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const name = `backup-${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}.json`;
  return name;
}

async function createBackup(req, res) {
  // Always produce JSON backup so it can be used for partial restore
  try {
    await jsonBackup(res);
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
}

async function jsonBackup(res) {
  const data = {};
  // Export all tables in a lightweight JSON form
  data.departments = await Department.findAll({ raw: true });
  data.users = await User.findAll({ raw: true });
  data.rooms = await Room.findAll({ raw: true });
  data.events = await Event.findAll({ raw: true });
  data.participants = await Participant.findAll({ raw: true });
  data.notifications = await Notification.findAll({ raw: true });
  data.projects = await Project.findAll({ raw: true });
  data.tasks = await Task.findAll({ raw: true });
  data.labels = await Label.findAll({ raw: true });
  data.taskLabels = await TaskLabel.findAll({ raw: true });
  data.taskAssignments = await TaskAssignment.findAll({ raw: true });
  data.taskComments = await TaskComment.findAll({ raw: true });
  data.eventDepartments = await EventDepartment.findAll({ raw: true });

  // Also include DB meta for clarity
  data._meta = {
    exportedAt: new Date().toISOString(),
    database: process.env.PGDATABASE || null,
    dialect: sequelize.getDialect(),
  };

  const json = JSON.stringify(data, null, 2);
  const name = `backup-${new Date().toISOString().replace(/[:.]/g,'-')}.json`;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${name}"`);
  return res.send(json);
}

async function restoreBackup(req, res) {
  let t; // transaction (if JSON path)
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ message: 'No backup file uploaded' });
    }
    const name = (req.file.originalname || '').toLowerCase();
    const buf = req.file.buffer;
    const textHead = buf.subarray(0, Math.min(buf.length, 2048)).toString('utf8');
    const isSql = name.endsWith('.sql') || /CREATE\s+TABLE|INSERT\s+INTO|SET\s+search_path/i.test(textHead);

    // If .sql → import via psql
    if (isSql) {
      const { PGHOST, PGUSER, PGPASSWORD, PGDATABASE, PGPORT } = process.env;
      if (!PGHOST || !PGUSER || !PGPASSWORD || !PGDATABASE) {
        return res.status(500).json({ message: 'Missing database env vars (PGHOST, PGUSER, PGPASSWORD, PGDATABASE)' });
      }
      const tmpPath = path.join(os.tmpdir(), `restore-${Date.now()}.sql`);
      fs.writeFileSync(tmpPath, buf);
      const args = [];
      if (PGHOST) { args.push('-h', PGHOST); }
      if (PGPORT) { args.push('-p', PGPORT); }
      if (PGUSER) { args.push('-U', PGUSER); }
      if (PGDATABASE) { args.push('-d', PGDATABASE); }
      // Stop on first error; run whole file atomically with -1 (single txn)
      args.push('-v', 'ON_ERROR_STOP=1', '-1', '-f', tmpPath);
      const bin = process.env.PSQL_PATH || 'psql';
      const child = spawn(bin, args, { env: { ...process.env, PGPASSWORD }, stdio: ['ignore','pipe','pipe'] });
      let stderr = '', stdout = '';
      let responded = false;
      const safeSend = (status, payload) => {
        if (responded || res.headersSent || res.writableEnded) return;
        responded = true;
        res.status(status).json(payload);
      };
      child.stderr.on('data', d => { stderr += d.toString(); });
      child.stdout.on('data', d => { stdout += d.toString(); });
      child.once('close', (code) => {
        try { fs.unlinkSync(tmpPath); } catch(_){ }
        if (code !== 0) {
          return safeSend(500, { message: `psql exited with code ${code}`, error: stderr.trim() || stdout.trim() });
        }
        if (!responded) {
          responded = true;
          return res.json({ message: 'SQL restore completed' });
        }
      });
      child.once('error', (err) => {
        try { fs.unlinkSync(tmpPath); } catch(_){ }
        return safeSend(500, { message: 'Failed to start psql. Set PSQL_PATH or install psql.', error: err.message });
      });
      return;
    }

    // Otherwise expect JSON
    let data;
    try { data = JSON.parse(buf.toString('utf8')); } catch (e) { return res.status(400).json({ message: 'Invalid JSON' }); }

    t = await sequelize.transaction();
    const summary = { inserted: {}, skipped_identical: {}, conflicts: {} };
    const ignore = ['createdAt','updatedAt'];
    const eq = (a,b) => {
      const ka = Object.keys(a).filter(k=>!ignore.includes(k)).sort();
      const kb = Object.keys(b).filter(k=>!ignore.includes(k)).sort();
      if (ka.length !== kb.length) return false;
      for (let i=0;i<ka.length;i++){ const k=ka[i]; if(k!==kb[i]) return false; if(String(a[k])!==String(b[k])) return false; }
      return true;
    };
    async function insertIfMissing(Model, rows, name) {
      const ins = 0, skip = 0, conf = 0;
      let inserted=ins, skipped=skip, conflicts=conf;
      for (const r of rows || []) {
        const id = r.id;
        if (!id) continue;
        const existing = await Model.findByPk(id, { transaction: t, raw: true });
        if (!existing) {
          try { await Model.create(r, { transaction: t }); inserted++; }
          catch(e){ conflicts++; }
        } else {
          if (eq(existing, r)) { skipped++; }
          else { conflicts++; }
        }
      }
      summary.inserted[name]=inserted; summary.skipped_identical[name]=skipped; summary.conflicts[name]=conflicts;
    }

    // Order to satisfy FKs, insert-only
    await insertIfMissing(Department, data.departments, 'departments');
    await insertIfMissing(User, data.users, 'users');
    await insertIfMissing(Room, data.rooms, 'rooms');
    await insertIfMissing(Event, data.events, 'events');
    await insertIfMissing(EventDepartment, data.eventDepartments, 'eventDepartments');
    await insertIfMissing(Participant, data.participants, 'participants');
    await insertIfMissing(Notification, data.notifications, 'notifications');
    await insertIfMissing(Project, data.projects, 'projects');
    await insertIfMissing(Task, data.tasks, 'tasks');
    await insertIfMissing(Label, data.labels, 'labels');
    await insertIfMissing(TaskLabel, data.taskLabels, 'taskLabels');
    await insertIfMissing(TaskAssignment, data.taskAssignments, 'taskAssignments');
    await insertIfMissing(TaskComment, data.taskComments, 'taskComments');

    await t.commit();
    return res.json({ message: 'Restore completed', summary });
  } catch (e) {
    try { if (t) await t.rollback(); } catch(_){ }
    return res.status(500).json({ message: e.message });
  }
}

module.exports = { createBackup, restoreBackup };
