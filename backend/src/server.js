require('dotenv').config();
const http = require('http');
const https = require('https');
const fs = require('fs');
const app = require('./app');
const { initSocket } = require('./utils/socket');
const { sequelize } = require('./models');
const runSeed = require('./seed/seed');
const { startReminderJob } = require('./jobs/reminder.job');

const PORT = process.env.PORT || 5000;
const HTTPS_PORT = process.env.HTTPS_PORT || 0; // set to number >0 to enable
// Prefer explicit HOST from env; fallback to all interfaces (0.0.0.0)
let HOST = process.env.HOST || '0.0.0.0';

async function start() {
  try {
    await sequelize.authenticate();
    await sequelize.sync();
    const seeded = await runSeed();
    if (seeded) console.log('✅ Database initialized with demo data');
  } catch (e) {
    console.error('Database error:', e.message);
  }

  const httpServer = http.createServer(app);
  initSocket(httpServer);

  httpServer.listen(PORT, HOST, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`📘 Swagger UI:          http://localhost:${PORT}/api-docs`);
    console.log(`🛠 Admin Panel:         http://localhost:${PORT}/admin/index.html`);
  });
  // start reminder cron job
  try { startReminderJob(); } catch (e) { console.warn('Reminder job failed to start:', e.message); }

  // Optional HTTPS server if cert/key provided
  if (HTTPS_PORT) {
    const certPath = process.env.SSL_CERT_PATH;
    const keyPath = process.env.SSL_KEY_PATH;
    if (certPath && keyPath && fs.existsSync(certPath) && fs.existsSync(keyPath)) {
      try {
        const credentials = {
          cert: fs.readFileSync(certPath),
          key: fs.readFileSync(keyPath),
        };
        const httpsServer = https.createServer(credentials, app);
        httpsServer.listen(HTTPS_PORT, HOST, () => {
          console.log(`🔐 HTTPS server running at https://localhost:${HTTPS_PORT}`);
        });
      } catch (e) {
        console.error('Failed to start HTTPS server:', e.message);
      }
    } else {
      console.warn('HTTPS not started: cert/key paths missing or files not found');
    }
  }
}

start();
