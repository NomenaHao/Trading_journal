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

function listAccounts(userId) {
  return db
    .prepare('SELECT * FROM trading_accounts WHERE user_id = ? ORDER BY id ASC')
    .all(userId)
    .map(formatTradingAccount);
}

function getActiveAccountId(userId) {
  const user = db.prepare('SELECT active_account_id FROM users WHERE id = ?').get(userId);
  return user?.active_account_id ?? null;
}

router.get('/', (req, res) => {
  const userId = req.user.userId;
  getActiveTradingAccountRow(userId);
  res.json({
    activeAccountId: getActiveAccountId(userId),
    accounts: listAccounts(userId),
  });
});

router.post('/', (req, res) => {
  const userId = req.user.userId;
  const {
    name,
    accountId,
    broker,
    brokerServer,
    accountType,
    balanceCurrency,
    startingCapital,
    riskPerTrade,
    currencyPairs,
    dailyGoal,
    monthlyGoal,
  } = req.body;

  if (!name?.trim()) {
    return res.status(400).json({ error: 'Le nom du compte est requis.' });
  }
  if (!accountId?.trim()) {
    return res.status(400).json({ error: "L'ID du compte est requis." });
  }
  if (accountIdExistsForUser(userId, accountId)) {
    return res.status(409).json({ error: 'Cet ID de compte existe déjà.' });
  }

  const type = accountType === 'real' ? 'real' : 'demo';
  const currency = resolveBalanceCurrency(type, balanceCurrency);

  const result = db.prepare(`
    INSERT INTO trading_accounts (
      user_id, name, account_id, broker, broker_server, account_type, balance_currency,
      starting_capital, risk_per_trade, currency_pairs, daily_goal, monthly_goal, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(
    userId,
    name.trim(),
    accountId.trim(),
    broker?.trim() || '',
    brokerServer?.trim() || '',
    type,
    currency,
    startingCapital ?? 1000,
    riskPerTrade ?? 5,
    JSON.stringify(currencyPairs?.length ? currencyPairs : ['EUR/USD']),
    dailyGoal ?? 5,
    monthlyGoal ?? 100
  );

  db.prepare('UPDATE users SET active_account_id = ? WHERE id = ?').run(
    result.lastInsertRowid,
    userId
  );

  res.status(201).json({
    activeAccountId: result.lastInsertRowid,
    accounts: listAccounts(userId),
  });
});

router.put('/:id', (req, res) => {
  const userId = req.user.userId;
  const accountId = Number(req.params.id);
  const existing = db
    .prepare('SELECT * FROM trading_accounts WHERE id = ? AND user_id = ?')
    .get(accountId, userId);

  if (!existing) {
    return res.status(404).json({ error: 'Compte introuvable.' });
  }

  const {
    name,
    accountId: externalId,
    broker,
    brokerServer,
    accountType,
    balanceCurrency,
    startingCapital,
    riskPerTrade,
    currencyPairs,
    dailyGoal,
    monthlyGoal,
  } = req.body;

  if (!name?.trim()) {
    return res.status(400).json({ error: 'Le nom du compte est requis.' });
  }
  if (!externalId?.trim()) {
    return res.status(400).json({ error: "L'ID du compte est requis." });
  }
  if (accountIdExistsForUser(userId, externalId, accountId)) {
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
      account_id = ?,
      broker = ?,
      broker_server = ?,
      account_type = ?,
      balance_currency = ?,
      starting_capital = ?,
      risk_per_trade = ?,
      currency_pairs = ?,
      daily_goal = ?,
      monthly_goal = ?,
      updated_at = datetime('now')
    WHERE id = ? AND user_id = ?
  `).run(
    name.trim(),
    externalId.trim(),
    broker?.trim() || '',
    brokerServer?.trim() || '',
    type,
    currency,
    startingCapital,
    riskPerTrade,
    JSON.stringify(currencyPairs),
    dailyGoal,
    monthlyGoal,
    accountId,
    userId
  );

  res.json({
    activeAccountId: getActiveAccountId(userId),
    accounts: listAccounts(userId),
  });
});

router.post('/:id/activate', (req, res) => {
  const userId = req.user.userId;
  const accountId = Number(req.params.id);
  const account = db
    .prepare('SELECT id FROM trading_accounts WHERE id = ? AND user_id = ?')
    .get(accountId, userId);

  if (!account) {
    return res.status(404).json({ error: 'Compte introuvable.' });
  }

  db.prepare('UPDATE users SET active_account_id = ? WHERE id = ?').run(accountId, userId);

  res.json({
    activeAccountId: accountId,
    accounts: listAccounts(userId),
    settings: formatTradingAccount(
      db.prepare('SELECT * FROM trading_accounts WHERE id = ?').get(accountId)
    ),
  });
});

router.delete('/:id', (req, res) => {
  const userId = req.user.userId;
  const accountId = Number(req.params.id);
  const count = db
    .prepare('SELECT COUNT(*) as count FROM trading_accounts WHERE user_id = ?')
    .get(userId).count;

  if (count <= 1) {
    return res.status(400).json({ error: 'Vous devez conserver au moins un compte.' });
  }

  const account = db
    .prepare('SELECT id FROM trading_accounts WHERE id = ? AND user_id = ?')
    .get(accountId, userId);

  if (!account) {
    return res.status(404).json({ error: 'Compte introuvable.' });
  }

  const wasActive = getActiveAccountId(userId) === accountId;

  db.prepare('DELETE FROM trading_accounts WHERE id = ? AND user_id = ?').run(accountId, userId);

  if (wasActive) {
    const next = db
      .prepare('SELECT id FROM trading_accounts WHERE user_id = ? ORDER BY id ASC LIMIT 1')
      .get(userId);
    db.prepare('UPDATE users SET active_account_id = ? WHERE id = ?').run(next.id, userId);
  }

  res.json({
    activeAccountId: getActiveAccountId(userId),
    accounts: listAccounts(userId),
  });
});

export default router;
