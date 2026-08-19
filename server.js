require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const reservasRouter = require('./routes/reservas');
const configRouter = require('./routes/config');

const app = express();
const PORT = process.env.PORT || 3000;

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

app.listen(PORT, () => {
  console.log(`Maré rodando em http://localhost:${PORT}`);
});
