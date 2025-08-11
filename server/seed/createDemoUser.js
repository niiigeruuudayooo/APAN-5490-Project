// server/seed/createDemoUser.js
/**
 * Create (or ensure) a demo user in MongoDB Atlas.
 * This script does NOT create any transactions.
 * Next step: run linkCsvToDemoUser.js to link CSV-imported docs to this user.
 *
 * Usage:
 *   node server/seed/createDemoUser.js
 *
 * Required env:
 *   MONGO_URI (Atlas connection string)
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const connectDB = require('../config/db');
const User = require('../models/User');

(async () => {
  await connectDB();

  // You can change these by environment variables if needed
  const email = process.env.DEMO_EMAIL || 'demo@fintrack.com';
  const password = process.env.DEMO_PASSWORD || 'demo123';
  const name = process.env.DEMO_NAME || 'Alex';

  let u = await User.findOne({ email });
  if (!u) {
    const passwordHash = await bcrypt.hash(password, 10);
    u = await User.create({ email, passwordHash, name });
    console.log('✅ Created demo user:', email, 'password:', password);
  } else {
    console.log('ℹ️ Demo user already exists:', email);
  }

  await mongoose.disconnect();
  process.exit(0);
})();
