const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

function timestampName() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const name = `backup-${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}.sql`;
  return name;
}

async function createBackup(req, res) {
  try {
    const { PGHOST, PGUSER, PGPASSWORD, PGDATABASE, PGPORT } = process.env;
    if (!PGHOST || !PGUSER || !PGPASSWORD || !PGDATABASE) {
      return res.status(500).json({ message: 'Missing database env vars (PGHOST, PGUSER, PGPASSWORD, PGDATABASE)' });
    }

    const filename = timestampName();
    const tmpPath = path.join(os.tmpdir(), filename);
    const out = fs.createWriteStream(tmpPath);

    const args = [
      '-h', PGHOST,
      '-U', PGUSER,
      '-d', PGDATABASE,
      '-F', 'p', // plain SQL format
    ];
    if (PGPORT) { args.unshift(PGPORT); args.unshift('-p'); }

    const child = spawn('pg_dump', args, {
      env: { ...process.env, PGPASSWORD },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stderr = '';
    child.stdout.pipe(out);
    child.stderr.on('data', (d) => { stderr += d.toString(); });

    child.on('error', (err) => {
      return res.status(500).json({ message: 'Failed to start pg_dump. Ensure it is installed and on PATH.', error: err.message });
    });

    child.on('close', (code) => {
      out.close();
      if (code !== 0) {
        try { fs.unlinkSync(tmpPath); } catch (_) {}
        return res.status(500).json({ message: `pg_dump exited with code ${code}`, error: stderr.trim() });
      }
      res.download(tmpPath, filename, (err) => {
        try { fs.unlinkSync(tmpPath); } catch (_) {}
        if (err) {
          console.error('Download error:', err);
        }
      });
    });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
}

module.exports = { createBackup };
