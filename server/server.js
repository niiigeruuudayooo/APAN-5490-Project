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

// ❗如果你之前有这样写，会在 CI 上因为路径/大小写报错；先注释掉
// const health = require('./controllers/healthController');
// app.get('/health/db', health.db);

const app = express();
app.set('trust proxy', 1);

// middleware
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(morgan('dev'));
app.use(rateLimit({ windowMs: 60 * 1000, max: 600, standardHeaders: true, legacyHeaders: false }));
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));

// connect MongoDB (Atlas)
connectDB();

// simple ping
app.get('/api/ping', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// inline health check (CI 用来验证云↔云是否连上 Atlas)
app.get('/health/db', (req, res) => {
  // 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
  const state = mongoose.connection.readyState;
  const ok = state === 1;
  res.status(ok ? 200 : 500).json({ db: ok ? 'up' : 'down', state });
});

// 业务路由 —— 先全部注释，等连通性验证完成再打开
// app.use('/api/auth', require('./routes/auth'));
// app.use('/api/transactions', require('./routes/transactions'));
// app.use('/api/budgets', require('./routes/budgets'));

// 404
app.use((req, res) => {
  res.status(404).json({ message: 'Not Found' });
});

// error handler
app.use((err, req, res, next) => {
  console.error('[error]', err);
  res.status(err.status || 500).json({ message: err.message || 'Server error' });
});

// start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[server] listening on :${PORT} (${process.env.NODE_ENV || 'dev'})`);
});

module.exports = app;
