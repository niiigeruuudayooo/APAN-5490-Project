// server/server.js
require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');

const { connectDB } = require('./config/db');

const app = express();
app.set('trust proxy', 1);

// ---------- Global middleware ----------
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(morgan('dev'));
app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
}));
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));

// ---------- Connect MongoDB (Atlas) ----------
connectDB();

// ---------- Simple ping ----------
app.get('/api/ping', (req, res) =>
  res.json({ ok: true, time: new Date().toISOString() })
);

// ---------- Health check ----------
// 旧写法（按你要求保留，但先注释，避免路径大小写出错）
// const health = require('./controllers/healthController');
// app.get('/health/db', health.db);

// 统一内联版（供 CI 探活 & 云↔云验证）
app.get('/health/db', (req, res) => {
  // 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
  const state = mongoose.connection.readyState;
  const ok = state === 1;
  res.status(ok ? 200 : 500).json({ db: ok ? 'up' : 'down', state });
});

// ---------- Business routes ----------
try {
  app.use('/api/auth', require('./routes/auth'));
} catch (e) {
  console.warn('[mount]/api/auth:', e.message);
}
try {
  app.use('/api/transactions', require('./routes/transactions'));
} catch (e) {
  console.warn('[mount]/api/transactions:', e.message);
}
try {
  app.use('/api/budgets', require('./routes/budgets'));
} catch (e) {
  console.warn('[mount]/api/budgets:', e.message);
}

// ---------- 404 ----------
app.use((req, res) => res.status(404).json({ message: 'Not Found' }));

// ---------- Error handler ----------
app.use((err, req, res, next) => {
  console.error('[error]', err);
  res.status(err.status || 500).json({ message: err.message || 'Server error' });
});

// ---------- Start ----------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[server] listening on :${PORT} (${process.env.NODE_ENV || 'dev'})`);
});

module.exports = app;
