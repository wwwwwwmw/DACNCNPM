require('dotenv').config();
console.log('[DB] Running alter sync...');
const { sequelize } = require('../src/models'); // models index registers all associations
(async () => {
  try {
    await sequelize.authenticate();
    console.log('[DB] Connected');
    await sequelize.sync({ alter: true });
    console.log('[DB] Schema updated (alter=true).');
  } catch (e) {
    console.error('[DB] Sync failed:', e);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
    console.log('[DB] Connection closed');
  }
})();
