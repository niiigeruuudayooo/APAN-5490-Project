// server/seed/linkCsvToDemoUser.js
// Usage: node server/seed/linkCsvToDemoUser.js
// Reads a local CSV and links each row to the demo user by userId.
// Preserves amount sign: negative = expense, positive = income.

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const mongoose = require('mongoose');

const User = require('../models/User');
const Transaction = require('../models/Transaction');

// --------- ENV & Defaults ---------
const {
  MONGO_URI,
  DEMO_EMAIL = 'demo@fintrack.com',

  CSV_FILE_PATH = './data/Expenses Data Set.csv',

  // CSV headers (mind spaces, wrap with quotes in .env)
  CSV_DATE_FIELD = 'Posting Date',
  CSV_AMOUNT_FIELD = 'Amount',
  CSV_CATEGORY_FIELD = 'Category',
  CSV_NOTE_FIELD = 'Description',
  CSV_PAYMENT_FIELD = 'Source',
  CSV_DAYOFWEEK_FIELD = 'Day of the Week',

  // optional
  CLEAR_BEFORE = 'true',
  IS_LARGE_THRESHOLD = '1000', // amount threshold for flagging large txn by absolute value
} = process.env;

const LARGE_TH = Number(IS_LARGE_THRESHOLD) || 1000;

// --------- Helpers ---------

/**
 * Parse "M/D/YY" or "MM/DD/YY" to { year, month, day, ymd }
 * 8/15/18 -> 2018-08-15
 */
function parseMDYY(mdyy) {
  if (!mdyy) return null;

  // normalize delimiters and trim
  const parts = String(mdyy).trim().split(/[/-]/);
  if (parts.length < 3) return null;

  let [m, d, yy] = parts.map(p => String(p).trim());
  // coerce to integers
  const month = String(parseInt(m, 10)).padStart(2, '0');
  const day = String(parseInt(d, 10)).padStart(2, '0');

  // 2-digit year: assume 20xx for < 50 else 19xx
  let yearNum = parseInt(yy, 10);
  if (yy.length <= 2) {
    yearNum = yearNum < 50 ? 2000 + yearNum : 1900 + yearNum;
  }
  const year = String(yearNum);

  return { year, month, day, ymd: `${year}-${month}-${day}` };
}

/** Build a transaction doc from a CSV row */
function buildTxnDoc(row, userId) {
  // required fields
  const dateCell = row[CSV_DATE_FIELD];
  const amountCell = row[CSV_AMOUNT_FIELD];
  const categoryCell = row[CSV_CATEGORY_FIELD];

  if (dateCell == null || amountCell == null || categoryCell == null) return null;

  const parsed = parseMDYY(dateCell);
  if (!parsed) return null;

  const amount = Number(amountCell);
  if (Number.isNaN(amount)) return null;

  const absAmount = Math.abs(amount);

  return {
    userId,
    // Store as Date object to be query-friendly; also store month string
    date: new Date(`${parsed.ymd}T00:00:00Z`),
    month: `${parsed.year}-${parsed.month}`,

    // keep original sign semantics
    amount,
    absAmount,
    isLarge: absAmount >= LARGE_TH,

    // optional/aux fields
    dayOfWeek: row[CSV_DAYOFWEEK_FIELD] ? String(row[CSV_DAYOFWEEK_FIELD]) : undefined,
    category: String(categoryCell),
    description: row[CSV_NOTE_FIELD] ? String(row[CSV_NOTE_FIELD]) : '',
    source: row[CSV_PAYMENT_FIELD] ? String(row[CSV_PAYMENT_FIELD]) : '',
    createdAt: new Date(),
  };
}

// --------- Main ---------

async function main() {
  if (!MONGO_URI) {
    console.error('❌ MONGO_URI is not set.');
    process.exit(1);
  }

  const csvPath = path.resolve(CSV_FILE_PATH);
  if (!fs.existsSync(csvPath)) {
    console.error(`❌ CSV file not found at: ${csvPath}`);
    process.exit(1);
  }

  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB Atlas');

  try {
    const demo = await User.findOne({ email: DEMO_EMAIL });
    if (!demo) {
      throw new Error(`Demo user not found by email: ${DEMO_EMAIL}. Create it first.`);
    }
    const userId = demo._id;
    console.log(`ℹ️ Linking CSV rows to user: ${DEMO_EMAIL} (${userId})`);

    if ((CLEAR_BEFORE || '').toLowerCase() === 'true') {
      const delRes = await Transaction.deleteMany({ userId });
      console.log(`🧹 Cleared ${delRes.deletedCount} existing transactions for demo user.`);
    }

    let count = 0;
    const batch = [];
    const BATCH_SIZE = 1000;

    await new Promise((resolve, reject) => {
      fs.createReadStream(csvPath)
        .pipe(csv())
        .on('data', (row) => {
          const doc = buildTxnDoc(row, userId);
          if (doc) {
            batch.push(doc);
            if (batch.length >= BATCH_SIZE) {
              // pause stream while inserting
              stream.pause();
              Transaction.insertMany(batch, { ordered: false })
                .then(() => {
                  count += batch.length;
                  batch.length = 0;
                  stream.resume();
                })
                .catch((err) => {
                  console.warn('⚠️ Batch insert warning:', err?.writeErrors?.length || err.message);
                  batch.length = 0;
                  stream.resume();
                });
            }
          }
        })
        .once('error', reject)
        .once('end', async () => {
          try {
            if (batch.length) {
              await Transaction.insertMany(batch, { ordered: false });
              count += batch.length;
            }
            resolve();
          } catch (err) {
            reject(err);
          }
        });

      // we need the stream handle to pause/resume
      const stream = fs.createReadStream(csvPath).pipe(csv());
    });

    console.log(`🎉 Imported ${count} transactions from CSV and linked to ${DEMO_EMAIL}`);
  } catch (err) {
    console.error('❌ Error during import:', err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected');
  }
}

main();
