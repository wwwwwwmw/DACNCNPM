require('dotenv').config();
const http = require('http');
const https = require('https');
const fs = require('fs');
const app = require('./app');
const { initSocket } = require('./utils/socket');
const { sequelize } = require('./models');
const runSeed = require('./seed/seed');

const os = require('os');
const PORT = process.env.PORT || 5000;
const HTTPS_PORT = process.env.HTTPS_PORT || 0; // set to number >0 to enable
// Prefer explicit HOST from env; fallback to all interfaces (0.0.0.0)
let HOST = process.env.HOST || '0.0.0.0';

// Helper to detect a LAN IPv4 for logging if HOST is 0.0.0.0
function getLanIp() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

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
    const lanIp = HOST === '0.0.0.0' ? getLanIp() : HOST;
    console.log(`🚀 Server running:`);
    console.log(`   • Local:   http://localhost:${PORT}`);
    console.log(`   • Network: http://${lanIp}:${PORT}`);
    console.log(`📘 Swagger UI:`);
    console.log(`   • Local:   http://localhost:${PORT}/api-docs`);
    console.log(`   • Network: http://${lanIp}:${PORT}/api-docs`);
    console.log(`🛠 Admin Panel:`);
    console.log(`   • Local:   http://localhost:${PORT}/admin/index.html`);
    console.log(`   • Network: http://${lanIp}:${PORT}/admin/index.html`);
    if (HTTPS_PORT) {
      console.log(`🔒 HTTPS (pending cert load) expected at https://localhost:${HTTPS_PORT} and https://${lanIp}:${HTTPS_PORT}`);
    }
  });

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
          const lanIp = HOST === '0.0.0.0' ? getLanIp() : HOST;
          console.log(`🔐 HTTPS server running:`);
          console.log(`   • Local:   https://localhost:${HTTPS_PORT}`);
          console.log(`   • Network: https://${lanIp}:${HTTPS_PORT}`);
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
