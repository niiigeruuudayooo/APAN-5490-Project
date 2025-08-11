// server/seed/createDemoUser.js
// Purpose:
// 1) Ensure a demo user exists in MongoDB Atlas.
// 2) Link existing CSV-imported transactions (docs WITHOUT userId) to this demo user,
//    so all protected APIs that filter by userId can see them.
// 3) Normalize transaction fields (type/amount/date) where possible.

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const connectDB = require('../config/db');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

(async () => {
  await connectDB();

  try {
    const email = 'demo@fintrack.com';
    const password = 'demo123';
    const name = 'Alex';

    // 1) Ensure demo user exists
    let user = await User.findOne({ email });
    if (!user) {
      const passwordHash = await bcrypt.hash(password, 10);
      user = await User.create({ email, passwordHash, name });
      console.log('✅ Created demo user:', email, '| password:', password);
    } else {
      console.log('ℹ️ Demo user already exists:', email);
    }

    const uid = user._id;

    // 2) Find CSV-imported transactions that have no userId and link them to the demo user
    //    Assumption: your CSV import wrote into the same "transactions" collection,
    //    but did NOT include a userId field.
    const criteria = { $or: [{ userId: { $exists: false } }, { userId: null }] };

    const missing = await Transaction.find(criteria).lean();
    console.log(`ℹ️ Found ${missing.length} CSV transactions without userId`);

    if (missing.length > 0) {
      // Prepare bulk updates with normalization
      const ops = missing.map((doc) => {
        // Normalize date if string
        let date = doc.date;
        if (typeof date === 'string') {
          const parsed = new Date(date);
          if (!isNaN(parsed.getTime())) date = parsed;
        }

        // Normalize type & amount:
        // - if type is missing, infer from amount sign
        // - make expense negative, income positive
        let amount = Number(doc.amount);
        let type = doc.type;
        if (!type) {
          type = amount >= 0 ? 'income' : 'expense';
        }
        if (type === 'expense' && amount > 0) amount = -amount;
        if (type === 'income' && amount < 0) amount = Math.abs(amount);

        return {
          updateOne: {
            filter: { _id: doc._id },
            update: {
              $set: {
                userId: uid,
                date: date instanceof Date && !isNaN(date) ? date : doc.date,
                amount,
                type,
              },
            },
          },
        };
      });

      if (ops.length) {
        const res = await Transaction.bulkWrite(ops, { ordered: false });
        console.log('✅ Linked CSV transactions to demo user. Bulk result:', {
          matched: res.matchedCount,
          modified: res.modifiedCount,
          upserts: res.upsertedCount,
        });
      }
    } else {
      console.log('✅ No orphan CSV transactions found. Nothing to link.');
    }

    // 3) Info: how many transactions now belong to the demo user?
    const count = await Transaction.countDocuments({ userId: uid });
    console.log(`ℹ️ Demo user now has ${count} transactions.`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed error:', err);
    await mongoose.disconnect();
    process.exit(1);
  }
})();
