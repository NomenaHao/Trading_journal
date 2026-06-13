import { Router } from 'express';
import db, { formatTrade, getActiveTradingAccountRow } from '../db.js';
import { normalizeDecimalInput, parseDecimal } from '../utils/numbers.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();
router.use(authRequired);

function parseTradePrices(body) {
  const entryPrice = normalizeDecimalInput(body.entryPrice);
  const takeProfit = normalizeDecimalInput(body.takeProfit);
  const stopLoss = normalizeDecimalInput(body.stopLoss);
  const profitLoss = parseDecimal(body.profitLoss);
  const positionCount = Number(body.positionCount);

  if (
    entryPrice == null ||
    takeProfit == null ||
    stopLoss == null ||
    profitLoss == null ||
    !Number.isInteger(positionCount) ||
    positionCount < 1
  ) {
    return null;
  }

  return { entryPrice, takeProfit, stopLoss, profitLoss, positionCount };
}

router.get('/', (req, res) => {
  const { pair } = req.query;
  const userId = req.user.userId;
  const account = getActiveTradingAccountRow(userId);
  let rows;

  if (pair) {
    rows = db.prepare(`
      SELECT * FROM trades
      WHERE user_id = ? AND trading_account_id = ? AND pair = ?
      ORDER BY closed_at DESC
    `).all(userId, account.id, pair);
  } else {
    rows = db.prepare(`
      SELECT * FROM trades
      WHERE user_id = ? AND trading_account_id = ?
      ORDER BY closed_at DESC
    `).all(userId, account.id);
  }

  res.json(rows.map(formatTrade));
});

router.post('/', (req, res) => {
  const {
    pair,
    entryPrice,
    takeProfit,
    stopLoss,
    positionCount,
    profitLoss,
    outcome,
    notes,
    mood,
    closedAt,
  } = req.body;

  if (
    !pair ||
    entryPrice == null ||
    takeProfit == null ||
    stopLoss == null ||
    positionCount == null ||
    profitLoss == null ||
    !['TP', 'SL', 'BE'].includes(outcome)
  ) {
    return res.status(400).json({ error: 'Champs requis manquants ou invalides.' });
  }

  const prices = parseTradePrices(req.body);
  if (!prices) {
    return res.status(400).json({ error: 'Valeurs numériques invalides.' });
  }

  const account = getActiveTradingAccountRow(req.user.userId);

  const result = db.prepare(`
    INSERT INTO trades (
      user_id, trading_account_id, pair, entry_price, take_profit, stop_loss,
      position_count, profit_loss, outcome, closed_at, notes, mood
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    req.user.userId,
    account.id,
    pair,
    prices.entryPrice,
    prices.takeProfit,
    prices.stopLoss,
    prices.positionCount,
    prices.profitLoss,
    outcome,
    closedAt || new Date().toISOString(),
    notes || '',
    mood || ''
  );

  const row = db
    .prepare('SELECT * FROM trades WHERE id = ? AND user_id = ?')
    .get(result.lastInsertRowid, req.user.userId);
  res.status(201).json(formatTrade(row));
});

router.delete('/:id', (req, res) => {
  const account = getActiveTradingAccountRow(req.user.userId);
  const result = db.prepare(`
    DELETE FROM trades WHERE id = ? AND user_id = ? AND trading_account_id = ?
  `).run(req.params.id, req.user.userId, account.id);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Trade introuvable.' });
  }
  res.json({ success: true });
});

router.put('/:id', (req, res) => {
  const {
    pair,
    entryPrice,
    takeProfit,
    stopLoss,
    positionCount,
    profitLoss,
    outcome,
    notes,
    mood,
    closedAt,
  } = req.body;

  if (
    !pair ||
    entryPrice == null ||
    takeProfit == null ||
    stopLoss == null ||
    positionCount == null ||
    profitLoss == null ||
    !['TP', 'SL', 'BE'].includes(outcome)
  ) {
    return res.status(400).json({ error: 'Champs requis manquants ou invalides.' });
  }

  const prices = parseTradePrices(req.body);
  if (!prices) {
    return res.status(400).json({ error: 'Valeurs numériques invalides.' });
  }

  const account = getActiveTradingAccountRow(req.user.userId);

  const result = db.prepare(`
    UPDATE trades SET
      pair = ?,
      entry_price = ?,
      take_profit = ?,
      stop_loss = ?,
      position_count = ?,
      profit_loss = ?,
      outcome = ?,
      closed_at = ?,
      notes = ?,
      mood = ?
    WHERE id = ? AND user_id = ? AND trading_account_id = ?
  `).run(
    pair,
    prices.entryPrice,
    prices.takeProfit,
    prices.stopLoss,
    prices.positionCount,
    prices.profitLoss,
    outcome,
    closedAt || new Date().toISOString(),
    notes || '',
    mood || '',
    req.params.id,
    req.user.userId,
    account.id
  );

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Trade introuvable.' });
  }

  const row = db
    .prepare('SELECT * FROM trades WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.user.userId);
  res.json(formatTrade(row));
});

export default router;
