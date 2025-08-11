// server/seed/linkCsvToDemoUser.js
// Purpose:
// Link CSV-imported transactions (docs WITHOUT userId) in MongoDB Atlas
// to the demo user, and normalize core fields. Designed to be idempotent.
//
// CSV columns you showed (Atlas after import keeps same names):
//   "Posting Date"  -> date (MM/DD/YY or MM/DD/YYYY; e.g., "8/15/18" = 2018-08-15)
//   "Amount"        -> amount (number; expenses often negative)
//   "Category"      -> category
//   "Description"   -> description (we map to note when needed)
//   "Source"        -> source (we map to paymentMethod when needed)
//
// This script supports both upper-case CSV field names and
// normalized lower-case field names if they already exist.
//
// ENV (optional):
//   MONGO_URI=<your Atlas URI>
//   FINTRACK_DB=fintrack
//   TX_COLLECTION=transactions
//   DEMO_EMAIL=demo@fintrack.com
//
// Run order:
//   1) npm run seed:user   (ensure demo user exists)
//   2) npm run seed:link   (bind orphan CSV docs -> demo user, normalize)

require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');

const FINTRACK_DB = process.env.FINTRACK_DB || 'fintrack';
const TX_COLLECTION = process.env.TX_COLLECTION || 'transactions';
const DEMO_EMAIL = process.env.DEMO_EMAIL || 'demo@fintrack.com';

/** Parse dates safely:
 * - Handle MM/DD/YY and MM/DD/YYYY explicitly.
 * - Also accept Date objects and fall back to native Date parsing.
 */
function parseDateSafe(value) {
  if (!value) return new Date();
  if (value instanceof Date) return value;

  const str = String(value).trim();

  // MM/DD/YY or MM/DD/YYYY  (e.g., "8/15/18", "08/15/2018")
  if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(str)) {
    const [mStr, dStr, yStr] = str.split('/');
    const m = Number(mStr);
    const d = Number(dStr);
    let y = Number(yStr);
    if (y < 100) y = 2000 + y; // "18" -> 2018
    // Construct local date (avoids timezone shift typical for T00:00:00Z)
    const date = new Date(y, m - 1, d);
    return isNaN(date.getTime()) ? new Date() : date;
  }

  // Fallback
  const d = new Date(str);
  return isNaN(d.getTime()) ? new Date() : d;
}

/** Normalize amount/type; keep expense negative, income positive. */
function normalizeAmountAndType(rawAmount, rawType) {
  let amount = Number(rawAmount);
  if (Number.isNaN(amount)) amount = 0;

  let type = rawType;
  if (!type) type = amount >= 0 ? 'income' : 'expense';

  if (type === 'expense' && amount > 0) amount = -amount;
  if (type === 'income' && amount < 0) amount = Math.abs(amount);

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

    // 2) Use target DB/collection (Atlas)
    const db = mongoose.connection.useDb(FINTRACK_DB);
    const col = db.collection(TX_COLLECTION);
    console.log(`ℹ️ Target collection: ${FINTRACK_DB}.${TX_COLLECTION}`);

    // 3) Find CSV docs with no userId (or null)
    const criteria = { $or: [{ userId: { $exists: false } }, { userId: null }] };
    const totalMissing = await col.countDocuments(criteria);
    console.log(`ℹ️ Found ${totalMissing} transaction(s) without userId`);

    if (totalMissing === 0) {
      console.log('✅ Nothing to link. Exiting.');
      await mongoose.disconnect();
      process.exit(0);
    }

    const cursor = col.find(criteria).batchSize(1000);
    let processed = 0;
    let modified = 0;
    const bulkSize = 500;
    let ops = [];

    while (await cursor.hasNext()) {
      const doc = await cursor.next();
      processed++;

      // Read field values with compatibility:
      const dateRaw =
        doc.date ??
        doc['Posting Date']; // MM/DD/YY or MM/DD/YYYY from CSV

      const category =
        doc.category ??
        doc.Category ??
        'Other';

      const description =
        doc.description ??
        doc.Description ??
        doc.note ??
        '';

      const source =
        doc.source ??
        doc.Source ??
        doc.paymentMethod ??
        'Unknown';

      const amountRaw =
        (doc.amount !== undefined ? doc.amount : undefined) ??
        doc.Amount ??
        0;

      const typeRaw =
        doc.type ??
        doc.Type;

      const date = parseDateSafe(dateRaw);
      const { amount, type } = normalizeAmountAndType(amountRaw, typeRaw);

      // Build $set with "fill/normalize if missing" semantics:
      const $set = { userId: demo._id };

      if (!doc.date || !(doc.date instanceof Date)) {
        $set.date = date;
      }
      if (doc.amount === undefined || Number.isNaN(Number(doc.amount))) {
        $set.amount = amount;
      }
      if (!doc.type) {
        $set.type = type;
      }
      if (!doc.category && doc.Category) {
        $set.category = doc.Category;
      } else if (!doc.category && !doc.Category) {
        $set.category = category; // "Other"
      }
      if (!doc.paymentMethod && source) {
        $set.paymentMethod = source;
      }
      if (!doc.note && description) {
        $set.note = description;
      }

      ops.push({
        updateOne: {
          filter: { _id: doc._id },
          update: { $set }
        }
      });

      if (ops.length >= bulkSize) {
        const res = await col.bulkWrite(ops, { ordered: false });
        modified += res.modifiedCount || 0;
        ops = [];
        console.log(`   ...bulk updated, total modified so far: ${modified}`);
      }
    }

    if (ops.length) {
      const res = await col.bulkWrite(ops, { ordered: false });
      modified += res.modifiedCount || 0;
    }

    console.log(`✅ Done. Processed: ${processed}, Modified: ${modified}`);

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
