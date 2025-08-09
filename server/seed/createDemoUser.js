/**
 * Creates a demo user for quick testing:
 * email: demo@fintrack.com, password: demo123
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../models/User');

(async function run() {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/fintrack';
  await mongoose.connect(uri);
  console.log('Connected Mongo');

  const email = 'demo@fintrack.com';
  const password = 'demo123';
  const name = 'Alex';

  let u = await User.findOne({ email });
  if (!u) {
    const passwordHash = await bcrypt.hash(password, 10);
    u = await User.create({ email, passwordHash, name });
    console.log(`Created demo user: ${email} / ${password}`);
  } else {
    console.log(`Demo user already exists: ${email}`);
  }

  await mongoose.disconnect();
  process.exit(0);
})().catch(e => {
  console.error(e);
  process.exit(1);
});
