import { Router } from 'express';
import db, {
  formatTradingAccount,
  getActiveTradingAccountRow,
  accountIdExistsForUser,
  resolveBalanceCurrency,
} from '../db.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();
router.use(authRequired);

router.get('/', (req, res) => {
  const row = getActiveTradingAccountRow(req.user.userId);
  res.json(formatTradingAccount(row));
});

router.put('/', (req, res) => {
  const userId = req.user.userId;
  const row = getActiveTradingAccountRow(userId);
  const {
    name,
    startingCapital,
    riskPerTrade,
    currencyPairs,
    dailyGoal,
    monthlyGoal,
    accountId,
    broker,
    brokerServer,
    accountType,
    balanceCurrency,
  } = req.body;

  if (!name?.trim()) {
    return res.status(400).json({ error: 'Le nom du compte est requis.' });
  }
  if (!accountId?.trim()) {
    return res.status(400).json({ error: "L'ID du compte est requis." });
  }
  if (accountIdExistsForUser(userId, accountId, row.id)) {
    return res.status(409).json({ error: 'Cet ID de compte existe déjà.' });
  }
  if (
    startingCapital == null ||
    riskPerTrade == null ||
    !Array.isArray(currencyPairs) ||
    currencyPairs.length === 0 ||
    dailyGoal == null ||
    monthlyGoal == null
  ) {
    return res.status(400).json({ error: 'Champs requis manquants ou invalides.' });
  }

  const type = accountType === 'real' ? 'real' : 'demo';
  const currency = resolveBalanceCurrency(type, balanceCurrency);

  db.prepare(`
    UPDATE trading_accounts SET
      name = ?,
      starting_capital = ?,
      risk_per_trade = ?,
      currency_pairs = ?,
      daily_goal = ?,
      monthly_goal = ?,
      account_id = ?,
      broker = ?,
      broker_server = ?,
      account_type = ?,
      balance_currency = ?,
      updated_at = datetime('now')
    WHERE id = ? AND user_id = ?
  `).run(
    name.trim(),
    startingCapital,
    riskPerTrade,
    JSON.stringify(currencyPairs),
    dailyGoal,
    monthlyGoal,
    accountId.trim(),
    broker || '',
    brokerServer || '',
    type,
    currency,
    row.id,
    userId
  );

  const updated = db.prepare('SELECT * FROM trading_accounts WHERE id = ?').get(row.id);
  res.json(formatTradingAccount(updated));
});

export default router;
