import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data');
const dbPath = path.join(dataDir, 'journal.db');
const jsonPath = path.join(dataDir, 'store.json');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    starting_capital REAL NOT NULL DEFAULT 1000,
    risk_per_trade REAL NOT NULL DEFAULT 5,
    currency_pairs TEXT NOT NULL DEFAULT '["EUR/USD"]',
    daily_goal REAL NOT NULL DEFAULT 5,
    monthly_goal REAL NOT NULL DEFAULT 100,
    account_id TEXT NOT NULL DEFAULT '',
    broker TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS trades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pair TEXT NOT NULL,
    entry_price REAL NOT NULL,
    take_profit REAL NOT NULL,
    stop_loss REAL NOT NULL,
    position_count INTEGER NOT NULL DEFAULT 1,
    profit_loss REAL NOT NULL,
    outcome TEXT NOT NULL CHECK (outcome IN ('TP', 'SL', 'BE')),
    closed_at TEXT NOT NULL DEFAULT (datetime('now')),
    notes TEXT DEFAULT ''
  );
`);

const settingsHasLegacyId = db.prepare('PRAGMA table_info(settings)').all().some((c) => c.name === 'id');
if (settingsHasLegacyId) {
  db.prepare('INSERT OR IGNORE INTO settings (id) VALUES (1)').run();
}

function migratePriceColumnsToText() {
  const entryCol = db.prepare(`PRAGMA table_info(trades)`).all().find((c) => c.name === 'entry_price');
  if (!entryCol || entryCol.type.toUpperCase() === 'TEXT') return;

  db.exec(`
    CREATE TABLE trades_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pair TEXT NOT NULL,
      entry_price TEXT NOT NULL,
      take_profit TEXT NOT NULL,
      stop_loss TEXT NOT NULL,
      position_count INTEGER NOT NULL DEFAULT 1,
      profit_loss REAL NOT NULL,
      outcome TEXT NOT NULL CHECK (outcome IN ('TP', 'SL', 'BE')),
      closed_at TEXT NOT NULL DEFAULT (datetime('now')),
      notes TEXT DEFAULT ''
    );

    INSERT INTO trades_new (
      id, pair, entry_price, take_profit, stop_loss, position_count,
      profit_loss, outcome, closed_at, notes
    )
    SELECT
      id, pair,
      CAST(entry_price AS TEXT),
      CAST(take_profit AS TEXT),
      CAST(stop_loss AS TEXT),
      position_count, profit_loss, outcome, closed_at, notes
    FROM trades;

    DROP TABLE trades;
    ALTER TABLE trades_new RENAME TO trades;
  `);

  console.log('Migration : prix stockés en TEXT (précision conservée).');
}

migratePriceColumnsToText();

function migrateToMultiUser() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const settingsCols = db.prepare('PRAGMA table_info(settings)').all();
  const hasUserIdOnSettings = settingsCols.some((c) => c.name === 'user_id');

  if (!hasUserIdOnSettings) {
    const legacy = db.prepare('SELECT * FROM settings WHERE id = 1').get();

    db.exec(`DROP TABLE IF EXISTS _legacy_settings`);
    if (legacy) {
      db.exec(`
        CREATE TABLE _legacy_settings (
          starting_capital REAL,
          risk_per_trade REAL,
          currency_pairs TEXT,
          daily_goal REAL,
          monthly_goal REAL,
          account_id TEXT,
          broker TEXT,
          updated_at TEXT
        )
      `);
      db.prepare(`
        INSERT INTO _legacy_settings VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        legacy.starting_capital,
        legacy.risk_per_trade,
        legacy.currency_pairs,
        legacy.daily_goal,
        legacy.monthly_goal,
        legacy.account_id,
        legacy.broker,
        legacy.updated_at
      );
    }

    db.exec('DROP TABLE settings');
    db.exec(`
      CREATE TABLE settings (
        user_id INTEGER PRIMARY KEY,
        starting_capital REAL NOT NULL DEFAULT 1000,
        risk_per_trade REAL NOT NULL DEFAULT 5,
        currency_pairs TEXT NOT NULL DEFAULT '["EUR/USD","GBP/USD","USD/JPY"]',
        daily_goal REAL NOT NULL DEFAULT 5,
        monthly_goal REAL NOT NULL DEFAULT 100,
        account_id TEXT NOT NULL DEFAULT '',
        broker TEXT NOT NULL DEFAULT '',
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('Migration : paramètres par utilisateur activés.');
  }

  const tradesCols = db.prepare('PRAGMA table_info(trades)').all();
  if (!tradesCols.some((c) => c.name === 'user_id')) {
    db.exec('ALTER TABLE trades ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE');
    console.log('Migration : trades liés aux utilisateurs.');
  }
}

migrateToMultiUser();

function migrateToUsername() {
  const cols = db.prepare('PRAGMA table_info(users)').all();
  if (!cols.length) return;
  if (cols.some((c) => c.name === 'username')) return;

  const hasEmail = cols.some((c) => c.name === 'email');
  if (!hasEmail) return;

  db.exec(`
    CREATE TABLE users_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const users = db.prepare('SELECT * FROM users').all();
  const insert = db.prepare(`
    INSERT INTO users_new (id, username, password_hash, name, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  const used = new Set();
  for (const u of users) {
    let base = '';
    if (u.email?.includes('@')) {
      base = u.email.split('@')[0].toLowerCase();
    } else if (u.email) {
      base = u.email.toLowerCase();
    } else {
      base = `user${u.id}`;
    }
    base = base.replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').slice(0, 20) || `user${u.id}`;

    let username = base;
    let i = 1;
    while (used.has(username)) {
      username = `${base}${i++}`;
    }
    used.add(username);
    insert.run(u.id, username, u.password_hash, u.name, u.created_at);
  }

  db.exec('DROP TABLE users');
  db.exec('ALTER TABLE users_new RENAME TO users');
  console.log('Migration : connexion par username activée.');
}

migrateToUsername();

function migrateProfileFields() {
  const cols = db.prepare('PRAGMA table_info(users)').all();
  if (!cols.some((c) => c.name === 'email')) {
    db.exec(`ALTER TABLE users ADD COLUMN email TEXT NOT NULL DEFAULT ''`);
  }
  if (!cols.some((c) => c.name === 'avatar')) {
    db.exec(`ALTER TABLE users ADD COLUMN avatar TEXT NOT NULL DEFAULT ''`);
  }

  const avatarsDir = path.join(dataDir, 'avatars');
  if (!fs.existsSync(avatarsDir)) {
    fs.mkdirSync(avatarsDir, { recursive: true });
  }
}

migrateProfileFields();

function migrateAccountType() {
  const cols = db.prepare('PRAGMA table_info(settings)').all();
  if (!cols.some((c) => c.name === 'account_type')) {
    db.exec(`ALTER TABLE settings ADD COLUMN account_type TEXT NOT NULL DEFAULT 'demo'`);
    console.log('Migration : type de compte (démo/réel) ajouté.');
  }
}

migrateAccountType();

function migrateBrokerServer() {
  const cols = db.prepare('PRAGMA table_info(settings)').all();
  if (!cols.some((c) => c.name === 'broker_server')) {
    db.exec(`ALTER TABLE settings ADD COLUMN broker_server TEXT NOT NULL DEFAULT ''`);
    console.log('Migration : serveur broker ajouté.');
  }
}

migrateBrokerServer();

function migrateTradeMood() {
  const cols = db.prepare('PRAGMA table_info(trades)').all();
  if (!cols.some((c) => c.name === 'mood')) {
    db.exec(`ALTER TABLE trades ADD COLUMN mood TEXT NOT NULL DEFAULT ''`);
    console.log('Migration : humeur des trades ajoutée.');
  }
}

migrateTradeMood();

function migrateToTradingAccounts() {
  const hasTable = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='trading_accounts'")
    .get();
  if (hasTable) return;

  db.exec(`
    CREATE TABLE trading_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL DEFAULT 'Mon compte',
      account_id TEXT NOT NULL DEFAULT '',
      broker TEXT NOT NULL DEFAULT '',
      broker_server TEXT NOT NULL DEFAULT '',
      account_type TEXT NOT NULL DEFAULT 'demo',
      starting_capital REAL NOT NULL DEFAULT 1000,
      risk_per_trade REAL NOT NULL DEFAULT 5,
      currency_pairs TEXT NOT NULL DEFAULT '["EUR/USD","GBP/USD","USD/JPY"]',
      daily_goal REAL NOT NULL DEFAULT 5,
      monthly_goal REAL NOT NULL DEFAULT 100,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  const userCols = db.prepare('PRAGMA table_info(users)').all();
  if (!userCols.some((c) => c.name === 'active_account_id')) {
    db.exec(`
      ALTER TABLE users ADD COLUMN active_account_id INTEGER
      REFERENCES trading_accounts(id) ON DELETE SET NULL
    `);
  }

  const settingsTable = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='settings'")
    .get();
  if (settingsTable) {
    const allSettings = db.prepare('SELECT * FROM settings').all();
    for (const s of allSettings) {
      const label = [s.broker, s.account_id].filter(Boolean).join(' #') || 'Compte principal';
      const externalId = s.account_id?.trim() || `compte-${s.user_id}`;
      const result = db.prepare(`
        INSERT INTO trading_accounts (
          user_id, name, account_id, broker, broker_server, account_type,
          starting_capital, risk_per_trade, currency_pairs, daily_goal, monthly_goal, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        s.user_id,
        label,
        externalId,
        s.broker || '',
        s.broker_server || '',
        s.account_type || 'demo',
        s.starting_capital,
        s.risk_per_trade,
        s.currency_pairs,
        s.daily_goal,
        s.monthly_goal,
        s.updated_at
      );
      db.prepare('UPDATE users SET active_account_id = ? WHERE id = ?').run(
        result.lastInsertRowid,
        s.user_id
      );
    }
  }

  const tradeCols = db.prepare('PRAGMA table_info(trades)').all();
  if (!tradeCols.some((c) => c.name === 'trading_account_id')) {
    db.exec(`
      ALTER TABLE trades ADD COLUMN trading_account_id INTEGER
      REFERENCES trading_accounts(id) ON DELETE CASCADE
    `);

    const users = db.prepare('SELECT id, active_account_id FROM users').all();
    for (const user of users) {
      if (!user.active_account_id) continue;
      db.prepare(`
        UPDATE trades SET trading_account_id = ?
        WHERE user_id = ? AND (trading_account_id IS NULL OR trading_account_id = '')
      `).run(user.active_account_id, user.id);
    }
  }

  console.log('Migration : comptes trading multiples activés.');
}

migrateToTradingAccounts();

export function formatTradingAccount(row) {
  return {
    id: row.id,
    name: row.name,
    accountId: row.account_id,
    broker: row.broker,
    brokerServer: row.broker_server || '',
    accountType: row.account_type || 'demo',
    startingCapital: row.starting_capital,
    riskPerTrade: row.risk_per_trade,
    currencyPairs: JSON.parse(row.currency_pairs),
    dailyGoal: row.daily_goal,
    monthlyGoal: row.monthly_goal,
    updatedAt: row.updated_at,
  };
}

export function createDefaultTradingAccount(userId, legacy = null) {
  const name = legacy
    ? [legacy.broker, legacy.account_id].filter(Boolean).join(' #') || 'Compte principal'
    : 'Compte principal';

  const result = db.prepare(`
    INSERT INTO trading_accounts (
      user_id, name, account_id, broker, broker_server, account_type,
      starting_capital, risk_per_trade, currency_pairs, daily_goal, monthly_goal, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    userId,
    name,
    legacy?.account_id?.trim() || `compte-${userId}`,
    legacy?.broker || '',
    legacy?.broker_server || '',
    legacy?.account_type || 'demo',
    legacy?.starting_capital ?? 1000,
    legacy?.risk_per_trade ?? 5,
    legacy?.currency_pairs ?? '["EUR/USD","GBP/USD","USD/JPY"]',
    legacy?.daily_goal ?? 5,
    legacy?.monthly_goal ?? 100,
    legacy?.updated_at || new Date().toISOString()
  );

  db.prepare('UPDATE users SET active_account_id = ? WHERE id = ?').run(
    result.lastInsertRowid,
    userId
  );

  return result.lastInsertRowid;
}

export function getActiveTradingAccountRow(userId) {
  const user = db.prepare('SELECT active_account_id FROM users WHERE id = ?').get(userId);

  if (user?.active_account_id) {
    const account = db
      .prepare('SELECT * FROM trading_accounts WHERE id = ? AND user_id = ?')
      .get(user.active_account_id, userId);
    if (account) return account;
  }

  let account = db
    .prepare('SELECT * FROM trading_accounts WHERE user_id = ? ORDER BY id ASC LIMIT 1')
    .get(userId);

  if (!account) {
    createDefaultTradingAccount(userId);
    account = db
      .prepare('SELECT * FROM trading_accounts WHERE user_id = ? ORDER BY id ASC LIMIT 1')
      .get(userId);
  }

  if (account) {
    db.prepare('UPDATE users SET active_account_id = ? WHERE id = ?').run(account.id, userId);
  }

  return account;
}

export function accountIdExistsForUser(userId, accountId, excludeId = null) {
  if (!accountId?.trim()) return false;
  const normalized = accountId.trim();
  if (excludeId) {
    const row = db.prepare(`
      SELECT id FROM trading_accounts
      WHERE user_id = ? AND account_id = ? AND id != ?
    `).get(userId, normalized, excludeId);
    return !!row;
  }
  const row = db.prepare(`
    SELECT id FROM trading_accounts WHERE user_id = ? AND account_id = ?
  `).get(userId, normalized);
  return !!row;
}

export function formatUser(row) {
  return {
    id: row.id,
    username: row.username,
    name: row.name,
    email: row.email || '',
    avatar: row.avatar || '',
    createdAt: row.created_at,
  };
}

export function getUserById(userId) {
  return db.prepare(`
    SELECT id, username, name, email, avatar, created_at
    FROM users WHERE id = ?
  `).get(userId);
}

export function createDefaultSettings(userId) {
  const legacyTable = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='_legacy_settings'")
    .get();

  if (legacyTable) {
    const legacy = db.prepare('SELECT * FROM _legacy_settings LIMIT 1').get();
    if (legacy) {
      const existing = db
        .prepare('SELECT id FROM trading_accounts WHERE user_id = ? LIMIT 1')
        .get(userId);
      if (!existing) {
        createDefaultTradingAccount(userId, legacy);
      }
      db.exec('DROP TABLE IF EXISTS _legacy_settings');
      return;
    }
  }

  const existing = db
    .prepare('SELECT id FROM trading_accounts WHERE user_id = ? LIMIT 1')
    .get(userId);
  if (!existing) {
    createDefaultTradingAccount(userId);
  }
}

export function assignOrphanDataToUser(userId) {
  createDefaultSettings(userId);
  const account = getActiveTradingAccountRow(userId);
  if (account) {
    db.prepare(`
      UPDATE trades SET user_id = ?, trading_account_id = ?
      WHERE user_id IS NULL
    `).run(userId, account.id);
  } else {
    db.prepare('UPDATE trades SET user_id = ? WHERE user_id IS NULL').run(userId);
  }
}

function migrateFromJson() {
  if (!fs.existsSync(jsonPath)) return;

  try {
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    const { settings, trades } = data;

    if (settings && settingsHasLegacyId) {
      db.prepare(`
        UPDATE settings SET
          starting_capital = ?,
          risk_per_trade = ?,
          currency_pairs = ?,
          daily_goal = ?,
          monthly_goal = ?,
          account_id = ?,
          broker = ?,
          updated_at = ?
        WHERE id = 1
      `).run(
        settings.startingCapital,
        settings.riskPerTrade,
        JSON.stringify(settings.currencyPairs),
        settings.dailyGoal,
        settings.monthlyGoal,
        settings.accountId || '',
        settings.broker || '',
        settings.updatedAt || new Date().toISOString()
      );
    }

    const existingTrades = db.prepare('SELECT COUNT(*) as count FROM trades').get();
    if (existingTrades.count === 0 && trades?.length) {
      const insert = db.prepare(`
        INSERT INTO trades (id, pair, entry_price, take_profit, stop_loss, position_count, profit_loss, outcome, closed_at, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const insertMany = db.transaction((items) => {
        for (const t of items) {
          insert.run(
            t.id,
            t.pair,
            t.entryPrice,
            t.takeProfit,
            t.stopLoss,
            t.positionCount,
            t.profitLoss,
            t.outcome,
            t.closedAt,
            t.notes || ''
          );
        }
      });

      insertMany(trades);

      const maxId = Math.max(...trades.map((t) => t.id), 0);
      if (maxId > 0) {
        db.prepare(`INSERT OR REPLACE INTO sqlite_sequence (name, seq) VALUES ('trades', ?)`).run(maxId);
      }
    }

    const backupPath = `${jsonPath}.bak`;
    fs.renameSync(jsonPath, backupPath);
    console.log(`Migration JSON → SQLite terminée (sauvegarde : ${backupPath})`);
  } catch (err) {
    console.error('Erreur migration store.json :', err.message);
  }
}

migrateFromJson();

export function formatSettings(row) {
  return formatTradingAccount(row);
}

export function formatTrade(row) {
  return {
    id: row.id,
    pair: row.pair,
    entryPrice: row.entry_price,
    takeProfit: row.take_profit,
    stopLoss: row.stop_loss,
    positionCount: row.position_count,
    profitLoss: row.profit_loss,
    outcome: row.outcome,
    closedAt: row.closed_at,
    notes: row.notes || '',
    mood: row.mood || '',
  };
}

export default db;
