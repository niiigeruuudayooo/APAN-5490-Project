/**
 * App entry: loads env, connects DB, configures Express, mounts routes.
 */
require('dotenv').config();
const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');

const authRoutes = require('./routes/auth');
const transactionsRoutes = require('./routes/transactions');
const budgetsRoutes = require('./routes/budgets');

const app = express();

// Connect Mongo
connectDB();

// Global middleware
app.use(express.json());
app.use(cookieParser());

// Static front-end
app.use(express.static(path.join(__dirname, '..', 'public')));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionsRoutes);
app.use('/api/budgets', budgetsRoutes);

// Fallback to front-end (single-page or simple static index.html)
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
