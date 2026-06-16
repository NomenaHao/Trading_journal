import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const tradeImagesDir = path.join(__dirname, '..', '..', 'data', 'trade-images');
export const MAX_TRADE_IMAGE_SIZE = 3 * 1024 * 1024;

export function ensureTradeImagesDir() {
  if (!fs.existsSync(tradeImagesDir)) {
    fs.mkdirSync(tradeImagesDir, { recursive: true });
  }
}

function userDir(userId) {
  ensureTradeImagesDir();
  const dir = path.join(tradeImagesDir, `user-${userId}`);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function parseImageDataUrl(image) {
  const match = image.match(/^data:(image\/(?:png|jpeg|jpg|webp));base64,(.+)$/);
  if (!match) {
    throw new Error('Format d\'image invalide. Utilisez PNG, JPG ou WEBP.');
  }

  const mime = match[1];
  const buffer = Buffer.from(match[2], 'base64');

  if (buffer.length > MAX_TRADE_IMAGE_SIZE) {
    throw new Error('Image trop volumineuse (max 3 Mo).');
  }

  const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
  return { buffer, ext };
}

function imagePathFromUrl(url) {
  if (!url?.startsWith('/api/uploads/trades/')) return null;
  const relative = url.replace('/api/uploads/trades/', '');
  return path.join(tradeImagesDir, relative);
}

export function deleteTradeImageFile(url) {
  const filepath = imagePathFromUrl(url);
  if (filepath && fs.existsSync(filepath)) {
    fs.unlinkSync(filepath);
  }
}

export function deleteTradeImages(userId, tradeId) {
  const dir = path.join(tradeImagesDir, `user-${userId}`);
  if (!fs.existsSync(dir)) return;

  for (const slot of ['before', 'after']) {
    for (const file of fs.readdirSync(dir)) {
      if (file.startsWith(`trade-${tradeId}-${slot}.`)) {
        fs.unlinkSync(path.join(dir, file));
      }
    }
  }
}

export function saveTradeImage(userId, tradeId, slot, imageDataUrl) {
  if (!imageDataUrl) return '';

  const { buffer, ext } = parseImageDataUrl(imageDataUrl);
  const dir = userDir(userId);
  const filename = `trade-${tradeId}-${slot}.${ext}`;
  const filepath = path.join(dir, filename);

  for (const file of fs.readdirSync(dir)) {
    if (file.startsWith(`trade-${tradeId}-${slot}.`)) {
      fs.unlinkSync(path.join(dir, file));
    }
  }

  fs.writeFileSync(filepath, buffer);
  return `/api/uploads/trades/user-${userId}/${filename}`;
}

export function resolveTradeImage(userId, tradeId, slot, value, existingUrl) {
  if (value === undefined) return existingUrl || '';

  if (value === null || value === '') {
    if (existingUrl) deleteTradeImageFile(existingUrl);
    return '';
  }

  if (typeof value === 'string' && value.startsWith('data:image/')) {
    if (existingUrl) deleteTradeImageFile(existingUrl);
    return saveTradeImage(userId, tradeId, slot, value);
  }

  if (typeof value === 'string' && value.startsWith('/api/uploads/trades/')) {
    return value;
  }

  return existingUrl || '';
}
