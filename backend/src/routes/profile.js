import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import db, { formatUser, getUserById } from '../db.js';
import { authRequired, signToken } from '../middleware/auth.js';

const router = Router();
router.use(authRequired);

const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;

function normalizeUsername(username) {
  return username?.trim().toLowerCase() || '';
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const avatarsDir = path.join(__dirname, '..', '..', 'data', 'avatars');
const MAX_AVATAR_SIZE = 2 * 1024 * 1024;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.get('/', (req, res) => {
  const user = getUserById(req.user.userId);
  if (!user) {
    return res.status(404).json({ error: 'Utilisateur introuvable.' });
  }
  res.json(formatUser(user));
});

router.put('/', (req, res) => {
  const { name, email, username } = req.body;

  if (!name?.trim()) {
    return res.status(400).json({ error: 'Le nom est requis.' });
  }

  if (!username?.trim()) {
    return res.status(400).json({ error: 'Le nom d\'utilisateur est requis.' });
  }

  const normalizedUsername = normalizeUsername(username);
  if (!USERNAME_REGEX.test(normalizedUsername)) {
    return res.status(400).json({
      error: 'Le nom d\'utilisateur doit contenir 3 à 20 caractères (lettres, chiffres, _).',
    });
  }

  const normalizedEmail = email?.trim().toLowerCase() || '';
  if (normalizedEmail && !EMAIL_REGEX.test(normalizedEmail)) {
    return res.status(400).json({ error: 'Adresse email invalide.' });
  }

  const current = db.prepare('SELECT username FROM users WHERE id = ?').get(req.user.userId);
  if (!current) {
    return res.status(404).json({ error: 'Utilisateur introuvable.' });
  }

  const usernameChanged = current.username !== normalizedUsername;

  if (usernameChanged) {
    const existingUsername = db.prepare(`
      SELECT id FROM users WHERE username = ? AND id != ?
    `).get(normalizedUsername, req.user.userId);
    if (existingUsername) {
      return res.status(409).json({ error: 'Ce nom d\'utilisateur est déjà utilisé.' });
    }
  }

  if (normalizedEmail) {
    const existing = db.prepare(`
      SELECT id FROM users WHERE email = ? AND id != ?
    `).get(normalizedEmail, req.user.userId);
    if (existing) {
      return res.status(409).json({ error: 'Cet email est déjà utilisé.' });
    }
  }

  db.prepare(`
    UPDATE users SET name = ?, email = ?, username = ? WHERE id = ?
  `).run(name.trim(), normalizedEmail, normalizedUsername, req.user.userId);

  const user = getUserById(req.user.userId);
  const payload = formatUser(user);

  if (usernameChanged) {
    return res.json({ ...payload, token: signToken(user) });
  }

  res.json(payload);
});

router.put('/password', (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Mot de passe actuel et nouveau requis.' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Le nouveau mot de passe doit contenir au moins 6 caractères.' });
  }

  const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.userId);
  if (!user || !bcrypt.compareSync(currentPassword, user.password_hash)) {
    return res.status(401).json({ error: 'Mot de passe actuel incorrect.' });
  }

  const passwordHash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, req.user.userId);

  res.json({ success: true });
});

router.put('/avatar', (req, res) => {
  const { image } = req.body;

  if (!image) {
    return res.status(400).json({ error: 'Image requise.' });
  }

  const match = image.match(/^data:(image\/(?:png|jpeg|jpg|webp));base64,(.+)$/);
  if (!match) {
    return res.status(400).json({ error: 'Format d\'image invalide. Utilisez PNG, JPG ou WEBP.' });
  }

  const mime = match[1];
  const buffer = Buffer.from(match[2], 'base64');

  if (buffer.length > MAX_AVATAR_SIZE) {
    return res.status(400).json({ error: 'Image trop volumineuse (max 2 Mo).' });
  }

  const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
  const filename = `user-${req.user.userId}.${ext}`;
  const filepath = path.join(avatarsDir, filename);
  const avatarUrl = `/api/uploads/avatars/${filename}`;

  removeUserAvatars(req.user.userId, ext);
  fs.writeFileSync(filepath, buffer);

  db.prepare('UPDATE users SET avatar = ? WHERE id = ?').run(avatarUrl, req.user.userId);

  const user = getUserById(req.user.userId);
  res.json(formatUser(user));
});

router.delete('/avatar', (req, res) => {
  removeUserAvatars(req.user.userId);
  db.prepare('UPDATE users SET avatar = ? WHERE id = ?').run('', req.user.userId);

  const user = getUserById(req.user.userId);
  res.json(formatUser(user));
});

function removeUserAvatars(userId, keepExt = null) {
  if (!fs.existsSync(avatarsDir)) return;

  for (const file of fs.readdirSync(avatarsDir)) {
    if (!file.startsWith(`user-${userId}.`)) continue;
    if (keepExt && file === `user-${userId}.${keepExt}`) continue;
    fs.unlinkSync(path.join(avatarsDir, file));
  }
}

export default router;
