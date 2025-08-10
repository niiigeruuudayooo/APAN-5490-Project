// server/server.js
require('dotenv').config();

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');

const { connectDB } = require('./config/db');

// ❌ 原来可能写过（在 Linux/CI 上会因路径/大小写不一致报错）
// const health = require('./controllers/healthController'); // ← 先注释掉
// app.get('/health/db', health.db); // ← 先注释掉

// --- init app ---
const app = express();
app.set('trust proxy', 1);

// --- global middleware ---
app.use(helmet());
app.use(
  cors({
    origin: true,            // 前端同/跨域都可；如需锁定，改为具体域名
    credentials: true,
  })
);
app.use(morgan('dev'));
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 600,                // 够 CI/前端测试用
    standardHeaders: true,
    legacyHeaders: false,
  })
);
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));

// --- connect DB ---
connectDB(); // 这里内部应当使用 process.env.MONGODB_URI 连接 Atlas

// --- simple ping (CI 可探活) ---
app.get('/api/ping', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// --- inline /health/db （关键：给 CI 用来验证云↔云连通性）---
app.get('/health/db', (req, res) => {
  // readyState: 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
  const state = mongoose.connection.readyState;
  const ok = state === 1;
  res.status(ok ? 200 : 500).json({ db: ok ? 'up' : 'down', state });
});

// --- mount business routes ---
try {
  app.use('/api/auth', require('./routes/auth'));               // POST /api/auth/login 等
} catch (e) {
  console.warn('[mount] /api/auth missing:', e.message);
}
try {
  app.use('/api/transactions', require('./routes/transactions'));
} catch (e) {
  console.warn('[mount] /api/transactions missing:', e.message);
}
try {
  app.use('/api/budgets', require('./routes/budgets'));
} catch (e) {
  console.warn('[mount] /api/budgets missing:', e.message);
}

// --- 404 fallback ---
app.use((req, res) => {
  res.status(404).json({ message: 'Not Found' })
