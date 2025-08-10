// server/seed/createDemoUser.js
const path = require('path');
// Always load .env from project root: <root>/.env
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const connectDB = require('../config/db');
const User = require('../models/User');

(async () => {
  try {
    await connectDB();

    const email = 'demo@fintrack.com';
    const password = 'demo123';
    const name = 'Alex';

    let user = await User.findOne({ email });

    if (!user) {
      const passwordHash = await bcrypt.hash(password, 10);
      user = await User.create({ email, passwordHash, name });
      console.log(`✅ Created demo user: ${email} (password: ${password})`);
    } else {
      // Ensure you can always login with demo123
      user.passwordHash = await bcrypt.hash(password, 10);
      if (!user.name) user.name = name;
      await user.save();
      console.log(`🔁 Reset password for existing demo user: ${email} (password: ${password})`);
    }
  } catch (err) {
    console.error('❌ Seed error:', err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    process.exit();
  }
})();
