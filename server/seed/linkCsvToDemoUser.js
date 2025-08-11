// server/seed/linkCsvToDemoUser.js
// Purpose:
// Link CSV-imported transactions (docs WITHOUT userId) in MongoDB Atlas
// to the demo user, and normalize core fields. Designed to be idempotent.
//
// Improvements over your version:
// - Uses bulkWrite for speed
// - Safer date parsing (avoid timezone drift for date-only strings)
// - NaN guards for amount
// - Only fills/normalizes fields if missing (avoid overwriting your later edits)
// - Configurable DB/collection via env vars
//
// ENV (optional):
//   MONGO_URI=<your Atlas URI>
//   FINTRACK_DB=fintrack
//   TX_COLLECTION=transactions
//   DEMO_EMAIL=demo@fintrack.com

require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');

const FINTRACK_DB = process.env.FINTRACK_DB || 'fintrack';
const TX_COLLECTION = process.env.TX_COLLECTION || 'transactions';
const DEMO_EMAIL = process.env.DEMO_EMAIL || 'demo@fintrack.com';

/** Parse a date string safely (avoid timezone shift for date-only CSV like '2025-08-08') */
function parseDateSafe(dateStr) {
  if (!dateStr) return new Date();
  // If it's already a Date, return as-is
  if (dateStr instanceof Date) return dateStr;

  // If looks like YYYY-MM-DD only, force UTC midnight
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const iso = `${dateStr}T00:00:00.000Z`;
    const d = new Date(iso);
    return isNaN(d.getTime()) ? new Date(dateStr) : d;
  }

  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? new Date() : d;
}

/** Normalize amount/type while preserving intent */
function normalizeAmountAndType(rawAmount, rawType) {
  let amount = Number(rawAmount);
  if (Number.isNaN(amount)) amount = 0;

  let type = rawType;
  if (!type) type = amount >= 0 ? 'income' : 'expense';

  // Ensure expense is negative, income is positive
  if (type === 'expense' && amount > 0) amount = -amount;
  if (type === 'income' && amount < 0) amount = Math.abs(amount);

  // Clamp absurd values? (optional)
  return { amount, type };
}

(async () => {
  try {
    await connectDB();

    // 1) Ensure demo user exists
    const demo = await User.findOne({ email: DEMO_EMAIL });
    if (!demo) {
      console.error(`❌ Demo user not found (${DEMO_EMAIL}). Run server/seed/createDemoUser.js first.`);
      process.exit(1);
    }
    console.log(`ℹ️ Demo user: ${demo.email} (${demo._id})`);

    // 2) Use desired DB/collection
    const db = mongoose.connection.useDb(FINTRACK_DB);
    const col = db.collection(TX_COLLECTION);
    console.log(`ℹ️ Target collection: ${FINTRACK_DB}.${TX_COLLECTION}`);

    // 3) Find CSV docs with no userId
    const criteria = { $or: [{ userId: { $exists: false } }, { userId: null }] };
    const totalMissing = await col.countDocuments(criteria);
    console.log(`ℹ️ Found ${totalMissing} transaction(s) without userId`);

    if (totalMissing === 0) {
      console.log('✅ Nothing to link. Exiting.');
      await mongoose.disconnect();
      process.exit(0);
    }

    // Stream in batches to avoid huge memory (change batchSize if needed)
    const cursor = col.find(criteria).batchSize(1000);

    let processed = 0;
    let modified = 0;
    const bulkSize = 500;
    let ops = [];

    while (await cursor.hasNext()) {
      const doc = await cursor.next();
      processed++;

      // Read CSV-style fields (adjust these names if your CSV uses different keys)
      const category = doc.category || 'Other';
      const description = doc.description || doc.note || ''; // keep existing note if present
      const source = doc.source || doc.paymentMethod || 'Unknown';

      // Prefer existing normalized fields if already present
      const date = parseDateSafe(doc.date);
      const { amount, type } = normalizeAmountAndType(
        doc.amount,
        doc.type
      );

      // Build update set with "fill if missing" semantics
      const $set = { userId: demo._id };

      if (!doc.date || !(doc.date instanceof Date)) {
        $set.date = date; // only set if original wasn't a proper Date
      }
      if (doc.amount === undefined || Number.isNaN(Number(doc.amount))) {
        $set.amount = amount;
      }
      if (!doc.type) {
        $set.type = type;
      }
      if (!doc.category) {
        $set.category = category;
      }
      if (!doc.paymentMethod) {
        $set.paymentMethod = source;
      }
      if (!doc.note && description) {
        $set.note = description;
      }

      // If $set only contains userId (i.e., no other changes), still update to link ownership
      ops.push({
        updateOne: {
          filter: { _id: doc._id },
          update: { $set },
        },
      });

      if (ops.length >= bulkSize) {
        const res = await col.bulkWrite(ops, { ordered: false });
        modified += res.modifiedCount || 0;
        ops = [];
        console.log(`   ...bulk updated, total modified so far: ${modified}`);
      }
    }

    // Flush tail
    if (ops.length) {
      const res = await col.bulkWrite(ops, { ordered: false });
      modified += res.modifiedCount || 0;
    }

    console.log(`✅ Done. Processed: ${processed}, Modified: ${modified}`);

    // Post-check: how many docs now owned by demo?
    const owned = await col.countDocuments({ userId: demo._id });
    console.log(`ℹ️ Demo user now owns ${owned} transaction(s).`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    await mongoose.disconnect();
    process.exit(1);
  }
})();
