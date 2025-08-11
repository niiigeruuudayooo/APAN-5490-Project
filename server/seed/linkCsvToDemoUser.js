// server/seed/linkCsvToDemoUser.js
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

(async () => {
  await connectDB();

  const DEMO_EMAIL = process.env.DEMO_EMAIL || 'demo@fintrack.com';
  const SRC_COLLECTION = process.env.CSV_COLLECTION || 'raw_csv_transactions';
  const LIMIT = process.env.CSV_LIMIT ? parseInt(process.env.CSV_LIMIT, 10) : 2000;
  const CLEAR_BEFORE = (process.env.CLEAR_BEFORE || 'true').toLowerCase() === 'true';

  const F_DATE = process.env.CSV_DATE_FIELD || 'Posting Date';
  const F_AMOUNT = process.env.CSV_AMOUNT_FIELD || 'Amount';
  const F_CATEGORY = process.env.CSV_CATEGORY_FIELD || 'Category';
  const F_TYPE = process.env.CSV_TYPE_FIELD || '';
  const F_NOTE = process.env.CSV_NOTE_FIELD || 'Description';
  const F_PAYMENT = process.env.CSV_PAYMENT_FIELD || 'Source';

  const demo = await User.findOne({ email: DEMO_EMAIL });
  if (!demo) {
    console.error(`❌ Demo user not found by email: ${DEMO_EMAIL}. Run createDemoUser.js first.`);
    process.exit(1);
  }
  const userId = demo._id;

  const db = mongoose.connection.db;
  const source = db.collection(SRC_COLLECTION);

  const total = await source.countDocuments({});
  console.log(`ℹ️ Found ${total} CSV records in "${SRC_COLLECTION}"`);

  const cursor = source.find({}).limit(LIMIT > 0 ? LIMIT : total);

  if (CLEAR_BEFORE) {
    await Transaction.deleteMany({ userId });
    console.log(`🧹 Cleared existing transactions for ${DEMO_EMAIL}`);
  }

  const batch = [];
  let processed = 0;

  while (await cursor.hasNext()) {
    const raw = await cursor.next();

    const rawDate = raw[F_DATE];
    const rawAmount = raw[F_AMOUNT];
    const rawCategory = raw[F_CATEGORY];
    const rawType = F_TYPE ? raw[F_TYPE] : undefined;
    const rawNote = raw[F_NOTE];
    const rawPayment = raw[F_PAYMENT];

    if (!rawDate || rawAmount == null || !rawCategory) continue;

    // Parse date in M/D/YY format
    let date;
    try {
      const [month, day, year] = String(rawDate).split('/');
      const fullYear = year.length === 2 ? `20${year}` : year;
      date = new Date(`${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
    } catch {
      continue;
    }
    if (isNaN(date.getTime())) continue;

    let amount = Number(rawAmount);
    if (Number.isNaN(amount)) continue;

    let type = rawType;
    if (!type) type = amount >= 0 ? 'income' : 'expense';
    else type = String(type).toLowerCase() === 'income' ? 'income' : 'expense';

    if (type === 'income' && amount < 0) amount = Math.abs(amount);
    if (type === 'expense' && amount > 0) amount = -amount;

    batch.push({
      userId,
      date,
      amount,
      type,
      category: String(rawCategory),
      paymentMethod: rawPayment ? String(rawPayment) : 'debit',
      note: rawNote ? String(rawNote) : '',
    });

    if (batch.length >= 1000) {
      await Transaction.insertMany(batch, { ordered: false });
      processed += batch.length;
      batch.length = 0;
    }
  }

  if (batch.length > 0) {
    await Transaction.insertMany(batch, { ordered: false });
    processed += batch.length;
  }

  console.log(`🎉 Linked ${processed} CSV records to ${DEMO_EMAIL}`);
  await mongoose.disconnect();
  process.exit(0);
})();
