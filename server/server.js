// server/server.js
require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const cors = require('cors');

const connectDB = require('./config/db');

const authRoutes = require('./routes/auth');
const transactionRoutes = require('./routes/transactions');
const budgetRoutes = require('./routes/budgets');

const app = express();

/** Connect to MongoDB Atlas */
connectDB();

/** Global middlewares */
app.use(express.json());
app.use(cookieParser());

// If your frontend runs on a different origin during dev, enable CORS with credentials
// app.use(cors({ origin: 'http://localhost:5173', credentials: true }));

/** Serve static files (adjust path to your actual public folder) */
app.use(express.static(path.join(__dirname, '..', 'public')));

/** API routes */
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/budgets', budgetRoutes);

/** Fallback to SPA/static index */
app.get('*', (_, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running: http://localhost:${PORT}`);
});
