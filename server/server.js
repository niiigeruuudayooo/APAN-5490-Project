// server.js
// Connects to MongoDB Atlas and serves your static site + /api/products

require('dotenv').config();
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');

// ---- Model (Product) ----
const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, default: '' },
    img: { type: String, default: '' }
  },
  { timestamps: true }
);
const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);

// ---- App setup ----
const app = express();
app.use(express.json());

// Serve static files (your front-end) from /public
app.use(express.static(path.join(__dirname, 'public')));

// Default homepage -> /public/index.html
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ---- API: Products ----
app.get('/api/products', async (_req, res) => {
  try {
    const products = await Product.find().lean();
    res.json(products);
  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).json({ message: 'Server Error' });
  }
});

// ---- MongoDB Atlas connection ----
// 支持两种变量名：MONGO_URI 或 MONGODB_URI（二选一即可）
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

if (!MONGO_URI) {
  console.warn('⚠️  MONGO_URI/MONGODB_URI is not set. Please add it to your .env / GitHub Secrets.');
}

mongoose
  .connect(MONGO_URI, {
    serverSelectionTimeoutMS: 10000, // 10s 快速失败
  })
  .then(() => {
    const { name, host } = mongoose.connection;
    console.log(`✅ MongoDB Atlas connected (db: ${name}, host: ${host})`);
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });

// ---- Health check (for CI / self-check) ----
app.get('/health/db', (_req, res) => {
  // 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
  const state = mongoose.connection.readyState;
  const ok = state === 1;
  res.status(ok ? 200 : 500).json({ db: ok ? 'up' : 'down', state });
});

// ---- Start server ----
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`🚀 Server is running at http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down...');
  await mongoose.connection.close();
  server.close(() => process.exit(0));
});
