// server/server.js
require('dotenv').config();
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');

const { connectDB } = require('./config/db'); // 你已统一为 { connectDB } 导出

// 业务路由（来自你同学分支）
const authRoutes = require('./routes/auth');               // /api/auth
const transactionsRoutes = require('./routes/transactions'); // /api/transactions
const budgetsRoutes = require('./routes/budgets');         // /api/budgets

// 健康检查控制器（你刚创建的）
const { getDbStatus, ping } = require('./controllers/healthController');

const app = express();

// ===== 连接数据库 =====
connectDB().catch(err => {
  console.error('❌ MongoDB connection failed:', err);
  process.exit(1);
});

// ===== 安全 & 通用中间件 =====
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(morgan('dev'));

// 对认证接口做轻量限流
app.use('/api/auth', rateLimit({ windowMs: 60 * 1000, max: 30 }));

// ===== 静态资源（如有 public/index.html）=====
app.use(express.static(path.join(__dirname, '..', 'public')));

// ===== API 路由 =====
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionsRoutes);
app.use('/api/budgets', budgetsRoutes);

// ===== 健康检查（内联到 server.js）=====
app.get('/health/db', getDbStatus);
app.get('/api/ping', ping);

// ===== 单页回退（可选）=====
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// ===== 启动 =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
