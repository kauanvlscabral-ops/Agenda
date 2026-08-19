require('dotenv').config();
const mysql = require('mysql2/promise');

// dateStrings: true -> datas DATE vêm como 'YYYY-MM-DD' (string), igual o front-end espera
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'appraia',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true,
});

module.exports = pool;
