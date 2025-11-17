const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { sequelize, Department, User, Room, Event, Participant, Notification, Project, Task, Label, TaskLabel, TaskAssignment, TaskComment, EventDepartment } = require('../../models');

function timestampName() {
  // Windows-safe (no colons) timestamped custom-format dump filename
  return `backup-${new Date().toISOString().replace(/[:.]/g, '-')}.backup`;
}

function resolveBinary(envName, fallbackCmd, windowsCandidates = []) {
  const v = process.env[envName];
  if (v && String(v).trim() !== '') {
    // Trust explicit env var value; let spawn fail if wrong
    return String(v).trim();
  }
  if (process.platform === 'win32') {
    for (const p of windowsCandidates) {
      try { if (fs.existsSync(p)) return p; } catch(_) {}
    }
  }
  return fallbackCmd;
}

async function createBackup(req, res) {
  // Produce a PostgreSQL custom format dump (.backup) using pg_dump -F c
  const { PGHOST, PGUSER, PGPASSWORD, PGDATABASE, PGPORT } = process.env;
  if (!PGDATABASE) {
    return res.status(500).json({ message: 'PGDATABASE env variable is required for backup' });
  }

  const fileName = timestampName();
  const dir = path.join(os.tmpdir(), 'pg_backups');
  try { fs.mkdirSync(dir, { recursive: true }); } catch (_) {}
  const filePath = path.join(dir, fileName);

  const args = [];
  if (PGHOST) args.push('-h', PGHOST);
  if (PGPORT) args.push('-p', PGPORT);
  if (PGUSER) args.push('-U', PGUSER);
  // Custom format (-F c) written to file (-f)
  args.push('-F', 'c', '-f', filePath, PGDATABASE);

  const bin = resolveBinary('PGDUMP_PATH', 'pg_dump', [
    'C\\\\Program Files\\\\PostgreSQL\\\\17\\\\bin\\\\pg_dump.exe',
    'C\\\\Program Files\\\\PostgreSQL\\\\16\\\\bin\\\\pg_dump.exe',
    'C\\\\Program Files\\\\PostgreSQL\\\\15\\\\bin\\\\pg_dump.exe',
  ]);
  let responded = false;
  const safeSend = (status, payload) => {
    if (responded || res.headersSent || res.writableEnded) return;
    responded = true;
    res.status(status).json(payload);
  };

  const child = spawn(bin, args, { env: { ...process.env, PGPASSWORD }, stdio: ['ignore', 'pipe', 'pipe'] });
  let stderr = '';
  child.stderr.on('data', d => { stderr += d.toString(); });
  child.once('error', err => {
    safeSend(500, { message: `Failed to start pg_dump (${bin}). Set PGDUMP_PATH or install PostgreSQL client tools.`, error: err.message });
  });
  child.once('close', code => {
    if (code !== 0) {
      return safeSend(500, { message: `pg_dump exited with code ${code}`, error: stderr.trim() });
    }
    // Stream file to client then delete temporary copy
    responded = true; // we'll respond via download
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    const stream = fs.createReadStream(filePath);
    stream.on('error', err => {
      safeSend(500, { message: 'Failed to read backup file', error: err.message });
    });
    stream.on('close', () => { try { fs.unlinkSync(filePath); } catch(_) {} });
    stream.pipe(res);
  });
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
  // Full overwrite restore from PostgreSQL custom format (.backup) using pg_restore --clean
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No backup file uploaded' });
    }
    const { PGHOST, PGUSER, PGPASSWORD, PGDATABASE, PGPORT } = process.env;
    if (!PGDATABASE) {
      return res.status(500).json({ message: 'PGDATABASE env variable is required for restore' });
    }

    // Determine source path: if multer used with disk storage we have req.file.path
    let sourcePath = req.file.path;
    const originalName = (req.file.originalname || '').toLowerCase();
    const hasKnownExt = originalName.endsWith('.backup') || originalName.endsWith('.dump');
    if (!sourcePath) {
      // Memory storage: write temp file
      if (!req.file.buffer) return res.status(400).json({ message: 'Uploaded file has no data' });
      sourcePath = path.join(os.tmpdir(), `restore-${Date.now()}.backup`);
      fs.writeFileSync(sourcePath, req.file.buffer);
    }

    // Validate by original filename if present; allow proceed if unknown
    if (originalName && !hasKnownExt) {
      return res.status(400).json({ message: 'Invalid file extension. Expected .backup (or .dump) custom format dump.' });
    }

    const args = [];
    if (PGHOST) args.push('-h', PGHOST);
    if (PGPORT) args.push('-p', PGPORT);
    if (PGUSER) args.push('-U', PGUSER);
    // Clean existing objects, ignore ownership/privilege restoration
    args.push('-c', '--if-exists', '--no-owner', '--no-privileges', '-d', PGDATABASE, sourcePath);

    const bin = resolveBinary('PGRESTORE_PATH', 'pg_restore', [
      'C\\\\Program Files\\\\PostgreSQL\\\\17\\\\bin\\\\pg_restore.exe',
      'C\\\\Program Files\\\\PostgreSQL\\\\16\\\\bin\\\\pg_restore.exe',
      'C\\\\Program Files\\\\PostgreSQL\\\\15\\\\bin\\\\pg_restore.exe',
    ]);
    let responded = false;
    const safeSend = (status, payload) => {
      if (responded || res.headersSent || res.writableEnded) return;
      responded = true;
      res.status(status).json(payload);
    };
    const child = spawn(bin, args, { env: { ...process.env, PGPASSWORD }, stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', d => { stderr += d.toString(); });
    child.once('error', err => {
      safeSend(500, { message: `Failed to start pg_restore (${bin}). Set PGRESTORE_PATH or install PostgreSQL client tools.`, error: err.message });
    });
    child.once('close', code => {
      // Cleanup uploaded/temp file
      try { fs.unlinkSync(sourcePath); } catch(_) {}
      if (code !== 0) {
        return safeSend(500, { message: `pg_restore exited with code ${code}`, error: stderr.trim() });
      }
      safeSend(200, { message: 'Restore completed (full overwrite)' });
    });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
}

module.exports = { createBackup, restoreBackup };
