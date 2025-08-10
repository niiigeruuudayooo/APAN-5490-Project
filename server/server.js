// server/server.js
require('dotenv').config();
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');

const dbConn = require('./config/db');
const connectDB = typeof dbConn === 'function' ? dbConn : dbConn.connectDB;

// Route imports
const authRoutes = require('./routes/auth');
const transactionsRoutes = require('./routes/transactions');
const budgetsRoutes = require('./routes/budgets');
const healthRoutes = require('./routes/healthRoutes');

const app = express();

// ===== Database Connection =====
connectDB().catch(err => {
  console.error('❌ MongoDB connection failed:', err);
  process.exit(1);
});

// ===== Security & Middleware =====
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(morgan('dev'));

// Rate limiting for auth endpoints
app.use('/api/auth', rateLimit({ windowMs: 60 * 1000, max: 30 }));

// ===== Static Frontend =====
app.use(express.static(path.join(__dirname, '..', 'public')));

// ===== API Routes =====
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionsRoutes);
app.use('/api/budgets', budgetsRoutes);
app.use('/', healthRoutes); // Health check routes

// ===== SPA / Frontend Fallback =====
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// ===== Start Server =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
