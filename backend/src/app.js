require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./config/swagger.config');
const path = require('path');

const app = express();

app.use(cors());
// Relax some Helmet policies to ensure Swagger UI and static assets work over LAN
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false,
}));
app.use(express.json());
app.use(morgan('dev'));

// Static admin panel (served from DACNPM/admin-web folder)
const adminWebPath = path.join(__dirname, '..', '..', 'admin-web');
app.use('/admin', express.static(adminWebPath));

// Routes
app.use('/api/auth', require('./modules/auth/auth.routes'));
app.use('/api/users', require('./modules/users/user.routes'));
app.use('/api/departments', require('./modules/departments/department.routes'));
app.use('/api/rooms', require('./modules/rooms/room.routes'));
app.use('/api/events', require('./modules/events/event.routes'));
app.use('/api/participants', require('./modules/participants/participant.routes'));
app.use('/api/notifications', require('./modules/notifications/notification.routes'));
app.use('/api/reports', require('./modules/reports/reports.routes'));

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs, { explorer: true }));

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Lịch Công Tác API' });
});

// Error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'Internal Server Error' });
});

module.exports = app;
