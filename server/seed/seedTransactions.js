// server/seed/seedTransactions.js
const path = require('path');
// Always load .env from project root: <root>/.env
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

(async () => {
  try {
    await connectDB();

    // 1) Find demo user
    const email = 'demo@fintrack.com';
    const user = await User.findOne({ email });
    if (!user) {
      console.error('❌ Demo user not found. Run createDemoUser.js first.');
      process.exitCode = 1;
      return;
    }

    // 2) Prepare dates (current month)
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();

    // 3) Clear previous transactions for this user (idempotent)
    const delRes = await Transaction.deleteMany({ userId: user._id });
    console.log(`🧹 Removed ${delRes.deletedCount || 0} existing transactions for ${email}`);

    // 4) Seed sample transactions
    const docs = [
      { userId: user._id, date: new Date(y, m, 3),  amount: -12.5, type: 'expense', category: 'Food',      paymentMethod: 'debit',  note: 'Breakfast' },
      { userId: user._id, date: new Date(y, m, 5),  amount: -55,   type: 'expense', category: 'Transport', paymentMethod: 'credit', note: 'Uber' },
      { userId: user._id, date: new Date(y, m, 8),  amount: -1200, type: 'expense', category: 'Rent',      paymentMethod: 'bank',   note: 'Monthly rent' },
      { userId: user._id, date: new Date(y, m, 10), amount: 2000,  type: 'income',  category: 'Salary',    paymentMethod: 'bank',   note: 'Part-time' },
    ];

    const insRes = await Transaction.insertMany(docs);
    console.log(`✅ Seeded ${insRes.length} sample transactions for ${email}`);
  } catch (err) {
    console.error('❌ Seed error:', err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    process.exit();
  }
})();
