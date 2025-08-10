// server/seed/seedTransactions.js
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

(async () => {
  await connectDB();

  const u = await User.findOne({ email: 'demo@fintrack.com' });
  if (!u) {
    console.error('❌ Demo user not found, run createDemoUser.js first');
    process.exit(1);
  }

  const uid = u._id;
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  await Transaction.deleteMany({ userId: uid });

  await Transaction.insertMany([
    { userId: uid, date: new Date(y, m, 3), amount: -12.5, type: 'expense', category: 'Food', paymentMethod: 'debit', note: 'Breakfast' },
    { userId: uid, date: new Date(y, m, 5), amount: -55, type: 'expense', category: 'Transport', paymentMethod: 'credit', note: 'Uber' },
    { userId: uid, date: new Date(y, m, 8), amount: -1200, type: 'expense', category: 'Rent', paymentMethod: 'bank', note: 'Monthly rent' },
    { userId: uid, date: new Date(y, m, 10), amount: 2000, type: 'income', category: 'Salary', paymentMethod: 'bank', note: 'Part-time' },
  ]);

  console.log('✅ Seeded sample transactions for', u.email);

  await mongoose.disconnect();
  process.exit(0);
})();
