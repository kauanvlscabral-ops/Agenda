const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /api/config - retorna a configuração fixa do imóvel (linha única, id=1)
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM configuracoes WHERE id = 1');
    if (!rows.length) {
      return res.json({ id: 1, enderecoImovel: null, nomeLocador: null });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar configurações.' });
  }
});

// PUT /api/config - atualiza o endereço fixo do imóvel / nome do locador
router.put('/', async (req, res) => {
  try {
    const { enderecoImovel, nomeLocador } = req.body;
    await pool.query(
      `INSERT INTO configuracoes (id, enderecoImovel, nomeLocador) VALUES (1, ?, ?)
       ON DUPLICATE KEY UPDATE enderecoImovel = VALUES(enderecoImovel), nomeLocador = VALUES(nomeLocador)`,
      [enderecoImovel || null, nomeLocador || null]
    );
    const [rows] = await pool.query('SELECT * FROM configuracoes WHERE id = 1');
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao salvar configurações.' });
  }
});

module.exports = router;
