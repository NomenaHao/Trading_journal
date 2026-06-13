import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db, { createDefaultSettings, assignOrphanDataToUser, formatUser, getUserById } from '../db.js';
import { signToken, authRequired } from '../middleware/auth.js';

const router = Router();

const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;

function normalizeUsername(username) {
  return username?.trim().toLowerCase() || '';
}

router.post('/register', (req, res) => {
  const { username, password, name } = req.body;

  if (!username?.trim() || !password || !name?.trim()) {
    return res.status(400).json({ error: 'Nom d\'utilisateur, mot de passe et nom requis.' });
  }

  const normalizedUsername = normalizeUsername(username);
  if (!USERNAME_REGEX.test(normalizedUsername)) {
    return res.status(400).json({
      error: 'Le nom d\'utilisateur doit contenir 3 à 20 caractères (lettres, chiffres, _).',
    });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères.' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(normalizedUsername);
  if (existing) {
    return res.status(409).json({ error: 'Ce nom d\'utilisateur est déjà utilisé.' });
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const result = db.prepare(`
    INSERT INTO users (username, password_hash, name)
    VALUES (?, ?, ?)
  `).run(normalizedUsername, passwordHash, name.trim());

  const userId = result.lastInsertRowid;
  const isFirstUser = db.prepare('SELECT COUNT(*) as count FROM users').get().count === 1;

  createDefaultSettings(userId);
  if (isFirstUser) {
    assignOrphanDataToUser(userId);
  }

  const user = getUserById(userId);
  const token = signToken(user);

  res.status(201).json({ token, user: formatUser(user) });
});

router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username?.trim() || !password) {
    return res.status(400).json({ error: 'Nom d\'utilisateur et mot de passe requis.' });
  }

  const normalizedUsername = normalizeUsername(username);
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(normalizedUsername);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Nom d\'utilisateur ou mot de passe incorrect.' });
  }

  const token = signToken(user);
  res.json({
    token,
    user: formatUser(getUserById(user.id)),
  });
});

router.get('/me', authRequired, (req, res) => {
  const user = getUserById(req.user.userId);
  if (!user) {
    return res.status(404).json({ error: 'Utilisateur introuvable.' });
  }
  res.json(formatUser(user));
});

export default router;
