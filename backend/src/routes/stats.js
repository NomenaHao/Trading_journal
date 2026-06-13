import { Router } from 'express';
import db, { formatSettings, formatTrade, getActiveTradingAccountRow } from '../db.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();
router.use(authRequired);

function getAccountId(userId) {
  return getActiveTradingAccountRow(userId).id;
}

router.get('/performance', (req, res) => {
  const period = req.query.period || 'day';
  const userId = req.user.userId;
  const accountId = getAccountId(userId);
  const settingsRow = getActiveTradingAccountRow(userId);
  const settings = settingsRow ? formatSettings(settingsRow) : { startingCapital: 1000, dailyGoal: 5, monthlyGoal: 100 };
  const trades = getTradesInPeriod(userId, accountId, period);

  const totalPnL = trades.reduce((sum, t) => sum + t.profitLoss, 0);
  const wins = trades.filter((t) => t.outcome === 'TP').length;
  const losses = trades.filter((t) => t.outcome === 'SL').length;
  const breakEvens = trades.filter((t) => t.outcome === 'BE').length;
  const totalDecisive = wins + losses;
  const winRate = totalDecisive > 0 ? (wins / totalDecisive) * 100 : 0;

  const goal =
    period === 'day' ? settings.dailyGoal :
    period === 'month' ? settings.monthlyGoal :
    null;

  const goalProgress = goal ? (totalPnL / goal) * 100 : null;
  const cumulativePnL = getCumulativePnL(userId, accountId);

  res.json({
    period,
    totalPnL: round(totalPnL),
    tradeCount: trades.length,
    wins,
    losses,
    breakEvens,
    winRate: round(winRate),
    goal,
    goalProgress: goalProgress != null ? round(goalProgress) : null,
    currentCapital: round(settings.startingCapital + cumulativePnL),
    startingCapital: settings.startingCapital,
  });
});

router.get('/by-pair', (req, res) => {
  const period = req.query.period || 'all';
  const userId = req.user.userId;
  const accountId = getAccountId(userId);
  const trades = period === 'all'
    ? getAllTrades(userId, accountId)
    : getTradesInPeriod(userId, accountId, period);

  const byPair = {};
  for (const trade of trades) {
    if (!byPair[trade.pair]) {
      byPair[trade.pair] = { pair: trade.pair, wins: 0, losses: 0, breakEvens: 0, netPnL: 0, total: 0 };
    }
    const stat = byPair[trade.pair];
    stat.total++;
    stat.netPnL += trade.profitLoss;
    if (trade.outcome === 'TP') stat.wins++;
    else if (trade.outcome === 'SL') stat.losses++;
    else stat.breakEvens++;
  }

  const result = Object.values(byPair).map((s) => ({
    ...s,
    netPnL: round(s.netPnL),
    winRate: s.wins + s.losses > 0 ? round((s.wins / (s.wins + s.losses)) * 100) : 0,
  }));

  res.json(result);
});

router.get('/timeline', (req, res) => {
  const period = req.query.period || 'month';
  const userId = req.user.userId;
  const accountId = getAccountId(userId);
  const settingsRow = getActiveTradingAccountRow(userId);
  const settings = settingsRow ? formatSettings(settingsRow) : { startingCapital: 1000 };
  const trades = getAllTrades(userId, accountId);
  const grouped = groupTradesByPeriod(trades, period);

  let cumulative = settings.startingCapital;
  const timeline = grouped.map((group) => {
    const pnl = group.trades.reduce((sum, t) => sum + t.profitLoss, 0);
    cumulative += pnl;
    return {
      label: group.label,
      pnl: round(pnl),
      cumulative: round(cumulative),
      trades: group.trades.length,
    };
  });

  res.json(timeline);
});

function getAllTrades(userId, accountId) {
  const rows = db.prepare(`
    SELECT * FROM trades
    WHERE user_id = ? AND trading_account_id = ?
    ORDER BY closed_at ASC
  `).all(userId, accountId);
  return rows.map(formatTrade);
}

function getCumulativePnL(userId, accountId) {
  const row = db.prepare(`
    SELECT COALESCE(SUM(profit_loss), 0) as total
    FROM trades WHERE user_id = ? AND trading_account_id = ?
  `).get(userId, accountId);
  return row.total;
}

function getTradesInPeriod(userId, accountId, period) {
  const now = new Date();
  let startDate;

  switch (period) {
    case 'day':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'week': {
      const day = now.getDay();
      const diff = day === 0 ? 6 : day - 1;
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff);
      break;
    }
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      return getAllTrades(userId, accountId);
  }

  const rows = db.prepare(`
    SELECT * FROM trades
    WHERE user_id = ? AND trading_account_id = ? AND closed_at >= ?
    ORDER BY closed_at DESC
  `).all(userId, accountId, startDate.toISOString());

  return rows.map(formatTrade);
}

function groupTradesByPeriod(trades, period) {
  const groups = new Map();

  for (const trade of trades) {
    const date = new Date(trade.closedAt);
    let key, label;

    switch (period) {
      case 'day':
        key = date.toISOString().slice(0, 10);
        label = date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
        break;
      case 'week': {
        const weekStart = getWeekStart(date);
        key = weekStart.toISOString().slice(0, 10);
        label = `Sem. ${weekStart.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}`;
        break;
      }
      case 'year':
        key = String(date.getFullYear());
        label = String(date.getFullYear());
        break;
      case 'month':
      default:
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        label = date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
        break;
    }

    if (!groups.has(key)) {
      groups.set(key, { label, trades: [] });
    }
    groups.get(key).trades.push(trade);
  }

  return Array.from(groups.values());
}

function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function round(n) {
  return Math.round(n * 100) / 100;
}

export default router;
