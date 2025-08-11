// server/seed/createDemoUser.js
// Purpose:
// Ensure a demo user exists in MongoDB Atlas. No linking here (single responsibility).

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const connectDB = require('../config/db');
const User = require('../models/User');

(async () => {
  await connectDB();

  try {
    const email = process.env.DEMO_EMAIL || 'demo@fintrack.com';
    const password = process.env.DEMO_PASSWORD || 'demo123';
    const name = process.env.DEMO_NAME || 'Alex';

    let user = await User.findOne({ email });
    if (!user) {
      const passwordHash = await bcrypt.hash(password, 10);
      user = await User.create({ email, passwordHash, name });
      console.log('✅ Created demo user:', email, '| password:', password);
    } else {
      console.log('ℹ️ Demo user already exists:', email);
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed error:', err);
    await mongoose.disconnect();
    process.exit(1);
  }
})();
