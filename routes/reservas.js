const express = require('express');
const router = express.Router();
const pool = require('../db');
const { STATUS_LIST, isValidStatus, computeFinance } = require('../shared/finance');

// Converte campos DECIMAL (vêm como string do mysql2) para number
function normalizeRow(row) {
  if (!row) return row;
  return {
    ...row,
    valorAluguel: row.valorAluguel !== null ? Number(row.valorAluguel) : 0,
    valorSinal: row.valorSinal !== null ? Number(row.valorSinal) : 0,
    valorRecebido: row.valorRecebido !== null ? Number(row.valorRecebido) : 0,
    totalAReceber: row.totalAReceber !== null ? Number(row.totalAReceber) : 0,
    limiteHospedes: row.limiteHospedes !== null ? Number(row.limiteHospedes) : 1,
    checkinHora: row.checkinHora ? String(row.checkinHora).slice(0, 5) : '14:00',
    checkoutHora: row.checkoutHora ? String(row.checkoutHora).slice(0, 5) : '11:00',
  };
}

function generateId() {
  return 'r_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// Verifica se já existe reserva com datas sobrepostas
async function findOverlap(checkin, checkout, excludeId) {
  const [rows] = await pool.query(
    `SELECT id, cliente, checkin, checkout FROM reservas
     WHERE id != ? AND checkin < ? AND checkout > ?
     LIMIT 1`,
    [excludeId || '', checkout, checkin]
  );
  return rows[0] || null;
}

function validatePayload(body) {
  const required = ['locatario', 'cliente', 'dataReserva', 'checkin', 'checkout'];
  for (const field of required) {
    if (!body[field] || String(body[field]).trim() === '') {
      return `O campo "${field}" é obrigatório.`;
    }
  }
  if (body.checkout <= body.checkin) {
    return 'A data de saída deve ser posterior à data de entrada.';
  }

  const status = body.status || 'pendente';
  if (!isValidStatus(status)) {
    return `Status inválido. Use um dos seguintes: ${STATUS_LIST.join(', ')}.`;
  }

  const aluguel = Number(body.valorAluguel) || 0;
  const sinal = Number(body.valorSinal) || 0;
  if (sinal < 0 || aluguel < 0) {
    return 'Os valores monetários não podem ser negativos.';
  }
  if (sinal > aluguel) {
    return 'O valor do sinal não pode ser maior que o valor total do aluguel.';
  }

  if (body.limiteHospedes !== undefined && body.limiteHospedes !== null && body.limiteHospedes !== '') {
    const limite = Number(body.limiteHospedes);
    if (!Number.isFinite(limite) || limite <= 0) {
      return 'O limite de hóspedes deve ser maior que zero.';
    }
  }

  const horaRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  if (body.checkinHora && !horaRegex.test(body.checkinHora)) {
    return 'Horário de check-in inválido. Use o formato HH:mm.';
  }
  if (body.checkoutHora && !horaRegex.test(body.checkoutHora)) {
    return 'Horário de check-out inválido. Use o formato HH:mm.';
  }

  return null;
}

// GET /api/reservas - lista todas as reservas (aceita filtros opcionais)
router.get('/', async (req, res) => {
  try {
    const { search, status, from, to } = req.query;
    let sql = 'SELECT * FROM reservas WHERE 1=1';
    const params = [];

    if (search) {
      sql += ' AND cliente LIKE ?';
      params.push(`%${search}%`);
    }
    if (status && status !== 'todos') {
      sql += ' AND status = ?';
      params.push(status);
    }
    if (from) {
      sql += ' AND checkin >= ?';
      params.push(from);
    }
    if (to) {
      sql += ' AND checkout <= ?';
      params.push(to);
    }
    sql += ' ORDER BY checkin DESC';

    const [rows] = await pool.query(sql, params);
    res.json(rows.map(normalizeRow));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar reservas.' });
  }
});

// GET /api/reservas/:id
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM reservas WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Reserva não encontrada.' });
    res.json(normalizeRow(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar reserva.' });
  }
});

// POST /api/reservas - cria uma nova reserva
router.post('/', async (req, res) => {
  try {
    const body = req.body;
    const validationError = validatePayload(body);
    if (validationError) return res.status(400).json({ error: validationError });

    const clash = await findOverlap(body.checkin, body.checkout, null);
    if (clash) {
      return res.status(409).json({
        error: `Conflito de datas com a reserva de ${clash.cliente} (${clash.checkin} — ${clash.checkout}).`,
      });
    }

    const id = body.id || generateId();
    const status = body.status || 'pendente';
    const { valorRecebido, totalAReceber } = computeFinance(status, body.valorAluguel, body.valorSinal);
    // sinalRecebido mantido por compatibilidade com telas/relatórios antigos
    const sinalRecebido = (status === 'recebido' || status === 'pago') ? 'sim' : 'nao';

    await pool.query(
      `INSERT INTO reservas
        (id, locatario, cliente, telefone, dataReserva, checkin, checkinHora, checkout, checkoutHora,
         limiteHospedes, valorAluguel, sinalRecebido, valorSinal, status, valorRecebido, totalAReceber, obs)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        body.locatario,
        body.cliente,
        body.telefone || null,
        body.dataReserva,
        body.checkin,
        body.checkinHora || '14:00',
        body.checkout,
        body.checkoutHora || '11:00',
        body.limiteHospedes || 1,
        body.valorAluguel || 0,
        sinalRecebido,
        body.valorSinal || 0,
        status,
        valorRecebido,
        totalAReceber,
        body.obs || null,
      ]
    );

    const [rows] = await pool.query('SELECT * FROM reservas WHERE id = ?', [id]);
    res.status(201).json(normalizeRow(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar reserva.' });
  }
});

// PUT /api/reservas/:id - atualiza uma reserva existente (inclui troca de status)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body;

    const [existingRows] = await pool.query('SELECT id FROM reservas WHERE id = ?', [id]);
    if (!existingRows.length) return res.status(404).json({ error: 'Reserva não encontrada.' });

    const validationError = validatePayload(body);
    if (validationError) return res.status(400).json({ error: validationError });

    const clash = await findOverlap(body.checkin, body.checkout, id);
    if (clash) {
      return res.status(409).json({
        error: `Conflito de datas com a reserva de ${clash.cliente} (${clash.checkin} — ${clash.checkout}).`,
      });
    }

    const status = body.status || 'pendente';
    const { valorRecebido, totalAReceber } = computeFinance(status, body.valorAluguel, body.valorSinal);
    const sinalRecebido = (status === 'recebido' || status === 'pago') ? 'sim' : 'nao';

    await pool.query(
      `UPDATE reservas SET
        locatario = ?, cliente = ?, telefone = ?, dataReserva = ?, checkin = ?, checkinHora = ?,
        checkout = ?, checkoutHora = ?, limiteHospedes = ?, valorAluguel = ?, sinalRecebido = ?,
        valorSinal = ?, status = ?, valorRecebido = ?, totalAReceber = ?, obs = ?
       WHERE id = ?`,
      [
        body.locatario,
        body.cliente,
        body.telefone || null,
        body.dataReserva,
        body.checkin,
        body.checkinHora || '14:00',
        body.checkout,
        body.checkoutHora || '11:00',
        body.limiteHospedes || 1,
        body.valorAluguel || 0,
        sinalRecebido,
        body.valorSinal || 0,
        status,
        valorRecebido,
        totalAReceber,
        body.obs || null,
        id,
      ]
    );

    const [rows] = await pool.query('SELECT * FROM reservas WHERE id = ?', [id]);
    res.json(normalizeRow(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar reserva.' });
  }
});

// DELETE /api/reservas/:id
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM reservas WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Reserva não encontrada.' });
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao excluir reserva.' });
  }
});

module.exports = router;
