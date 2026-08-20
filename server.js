require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const pool = require('./db');

const reservasRouter = require('./routes/reservas');
const configRouter = require('./routes/config');

const app = express();
const PORT = process.env.DB_PORTDB_PORT;

app.use(cors());
app.use(express.json());

// API
app.use('/api/reservas', reservasRouter);
app.use('/api/config', configRouter);

// Front-end estático (index.html, style.css, script.js)
app.use(express.static(path.join(__dirname)));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

(async () => {
  try {
    const conn = await pool.getConnection();
    console.log('✅ Conectado ao MySQL Aiven!');
    conn.release();
  } catch (err) {
    console.error('❌ Erro ao conectar:', err);
  }
})();
