// server.js
// Connects to MongoDB Atlas and serves your static site + /api/products

require('dotenv').config();
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');

// ---- Model (Product) ----
// If you already have this in a separate file like ./models/Product.js,
// you can keep that and require it. For a minimal inline schema:
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

// (Optional) Seed one-time route for quick demo (disable in prod)
// app.post('/api/products/seed', async (_req, res) => {
//   try {
//     await Product.deleteMany({});
//     await Product.insertMany([
//       { name: 'Eco Battery Pack', description: 'High-capacity rechargeable storage for your solar systems.', img: 'product1-placeholder.png' },
//       { name: 'Smart Inverter', description: 'Convert and optimize energy usage with intelligent tech.', img: 'product2-placeholder.png' },
//       { name: 'All in One System', description: 'Everything you need to start your sustainable home journey.', img: 'product3-placeholder.png' }
//     ]);
//     res.json({ ok: true });
//   } catch (e) {
//     console.error(e);
//     res.status(500).json({ message: 'Seed failed' });
//   }
// });

// ---- MongoDB Atlas connection ----
const MONGO_URI = process.env.MONGO_URI; // put your Atlas URI in .env

if (!MONGO_URI) {
  console.warn('⚠️  MONGO_URI is not set. Please add it to your .env (MongoDB Atlas connection string).');
}

mongoose
  .connect(MONGO_URI, {
    // With Mongoose 8+, defaults are good; you can add options if needed.
    // serverSelectionTimeoutMS: 10000,
  })
  .then(() => console.log('✅ MongoDB Atlas connected'))
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
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
