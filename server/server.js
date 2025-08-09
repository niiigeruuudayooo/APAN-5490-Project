// server/server.js
require('dotenv').config();
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const { connectMongo } = require('./db/connect');

const app = express();

// 安全 & 基础中间件
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// 针对认证接口做轻量限流（防刷）
app.use('/api/auth', rateLimit({ windowMs: 60 * 1000, max: 30 }));

// 静态资源（前端）
app.use(express.static(path.join(__dirname, '..', 'public')));

// 路由
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/', require('./routes/healthRoutes'));

// TODO: Joe 的受保护接口（示例）
// const auth = require('./middleware/auth');
// app.use('/api/transactions', auth, require('./routes/transactionsRoutes'));
// app.use('/api/stats', auth, require('./routes/statsRoutes'));

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
const MONGO_DB = process.env.MONGO_DB || 'fintrack';

connectMongo(MONGODB_URI, MONGO_DB)
  .then(() => {
    app.listen(PORT, () => console.log(`🚀 Server running http://localhost:${PORT}`));
  })
  .catch(err => {
    console.error('Mongo connect failed:', err);
    process.exit(1);
  });
