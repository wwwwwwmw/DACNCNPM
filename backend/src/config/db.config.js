require('dotenv').config();
const { Sequelize, DataTypes } = require('sequelize');

const {
  DATABASE_URL,
  PGHOST,
  PGPORT,
  PGUSER,
  PGPASSWORD,
  PGDATABASE,
} = process.env;

let sequelize;
if (DATABASE_URL && DATABASE_URL.trim() !== '') {
  sequelize = new Sequelize(DATABASE_URL, {
    dialect: 'postgres',
    logging: false,
  });
} else {
  sequelize = new Sequelize(PGDATABASE || 'calendar_app', PGUSER || 'postgres', PGPASSWORD || 'postgres', {
    host: PGHOST || 'localhost',
    port: Number(PGPORT) || 5432,
    dialect: 'postgres',
    logging: false,
  });
}

module.exports = { sequelize, DataTypes };
