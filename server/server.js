// server/server.js
const path = require('path');
const dotenv = require('dotenv');

// --- Load .env (prefer project root, then fallback to server/.env) ---
dotenv.config({ path: path.join(__dirname, '..', '.env') });
if (!process.env.MONGO_URI && !process.env.MONGODB_URI) {
  dotenv.config({ path: path.join(__dirname, '.env') });
}

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

// If your frontend runs on a different origin during dev, enable CORS with credentials:
// app.use(cors({ origin: 'http://localhost:5173', credentials: true }));

/** Serve static files (public is sibling of server) */
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

/** Start only after DB is connected */
(async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`✅ Server running: http://localhost:${PORT}`);
  });
})();
