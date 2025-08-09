/**
 * Seeds a few sample transactions for the demo user (current month).
 * If you want CSV import from Kaggle, plug csv-parse here instead.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

(async function run() {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/fintrack';
  await mongoose.connect(uri);
  console.log('Connected Mongo');

  const demo = await User.findOne({ email: 'demo@fintrack.com' });
  if (!demo) {
    console.log('Demo user missing. Run: npm run seed:user');
    process.exit(1);
  }

  const uid = demo._id;
  await Transaction.deleteMany({ userId: uid });

  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  await Transaction.insertMany([
    { userId: uid, date: new Date(y, m, 3), amount: -12.5, type:'expense', category:'Food', paymentMethod:'debit', note:'McDonalds' },
    { userId: uid, date: new Date(y, m, 5), amount: -55, type:'expense', category:'Transport', paymentMethod:'credit', note:'Uber' },
    { userId: uid, date: new Date(y, m, 8), amount: -1200, type:'expense', category:'Rent', paymentMethod:'bank', note:'July rent' },
    { userId: uid, date: new Date(y, m, 10), amount: 2000, type:'income', category:'Salary', paymentMethod:'bank', note:'Part-time' }
  ]);

  console.log('Seeded transactions for demo user');
  await mongoose.disconnect();
  process.exit(0);
})().catch(e => {
  console.error(e);
  process.exit(1);
});
