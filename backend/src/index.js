import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import authRouter from './routes/auth.js';
import profileRouter from './routes/profile.js';
import settingsRouter from './routes/settings.js';
import accountsRouter from './routes/accounts.js';
import tradesRouter from './routes/trades.js';
import statsRouter from './routes/stats.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const avatarsDir = path.join(__dirname, '..', 'data', 'avatars');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '3mb' }));
app.use('/api/uploads/avatars', express.static(avatarsDir));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRouter);
app.use('/api/profile', profileRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/accounts', accountsRouter);
app.use('/api/trades', tradesRouter);
app.use('/api/stats', statsRouter);

app.listen(PORT, () => {
  console.log(`Trading Journal API running on http://localhost:${PORT}`);
});
