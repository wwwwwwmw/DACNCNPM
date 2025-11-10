const swaggerJsdoc = require('swagger-jsdoc');

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';
// Determine LAN IP for swagger servers list when HOST is 0.0.0.0
const os = require('os');
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
const lanIp = HOST === '0.0.0.0' ? getLanIp() : HOST;

const servers = [
  { url: `http://localhost:${PORT}`, description: 'Local HTTP' },
  { url: `http://${lanIp}:${PORT}`, description: 'LAN HTTP' },
];
const httpsPort = process.env.HTTPS_PORT;
if (httpsPort) {
  servers.push({ url: `https://localhost:${httpsPort}`, description: 'Local HTTPS' });
  servers.push({ url: `https://${lanIp}:${httpsPort}`, description: 'LAN HTTPS' });
}

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Lịch Công Tác API',
      version: '1.0.0',
      description: 'API Backend cho ứng dụng quản lý lịch công tác (Express + PostgreSQL + Sequelize + Socket.IO)'
    },
    servers,
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['src/modules/**/*.routes.js'],
};

const specs = swaggerJsdoc(options);

module.exports = specs;
