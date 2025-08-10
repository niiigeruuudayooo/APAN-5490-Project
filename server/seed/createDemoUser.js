// server/seed/createDemoUser.js
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const connectDB = require('../config/db');
const User = require('../models/User');

(async () => {
  await connectDB();
  const email = 'demo@fintrack.com';
  const password = 'demo123';
  const name = 'Alex';

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
