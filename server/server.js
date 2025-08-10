// server/server.js
const path = require('path');
const dotenv = require('dotenv');

// 先加载根目录 .env；如不存在，再尝试加载 server/.env（两边都存在时以后加载的为准）
dotenv.config();
dotenv.config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');

const connectDB = require('./config/db');

const authRoutes = require('./routes/auth');
const transactionRoutes = require('./routes/transactions');
const budgetRoutes = require('./routes/budgets');

const app = express();

/** Global middlewares */
app.use(express.json());
app.use(cookieParser());
// 如果前端在其它域调试再打开（并把 origin 改成你的前端地址）
// app.use(cors({ origin: 'http://localhost:5173', credentials: true }));

/** Serve static files */
app.use(express.static(path.join(__dirname, '..', 'public')));

/** API routes */
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/budgets', budgetRoutes);

/** （可选）健康检查，做 check 时再放开 */
// const mongoose = require('mongoose');
// app.get('/health/db', (_req, res) => {
//   const ok = mongoose.connection.readyState === 1; // 1=connected
//   res.status(ok ? 200 : 500).json({ db: ok ? 'up' : 'down', state: mongoose.connection.readyState });
// });

/** Fallback to SPA/static index */
app.get('*', (_, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;

// 等待连上 Atlas 再启动服务（关键改动）
(async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`✅ Server running: http://localhost:${PORT}`);
  });
})();
