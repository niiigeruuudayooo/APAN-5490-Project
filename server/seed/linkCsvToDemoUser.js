/**
 * Patch existing CSV-imported transactions in MongoDB Atlas by attaching demo user's userId.
 * - Uses DEMO_USER_ID if provided; otherwise falls back to DEMO_EMAIL lookup.
 * - Only patches documents where userId does NOT exist.
 * - Also back-fills derived fields (month / absAmount / isLarge) if missing.
 */

const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

const User = require("../models/User");

const {
  MONGO_URI,
  SOURCE_DB,
  CSV_COLLECTION,
  DEMO_USER_ID,
  DEMO_EMAIL,
  CSV_DATE_FIELD,
  CSV_AMOUNT_FIELD,
  CSV_CATEGORY_FIELD,
  CSV_NOTE_FIELD,
  CSV_PAYMENT_FIELD,
  CSV_DAYOFWEEK_FIELD,
  IS_LARGE_THRESHOLD,
  BATCH_SIZE
} = process.env;

const BATCH = parseInt(BATCH_SIZE || "1000", 10);
const LARGE_TH = parseFloat(IS_LARGE_THRESHOLD || "1000");

function parseMonthStr(dateObj) {
  if (!dateObj || isNaN(dateObj.getTime())) return null;
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function parseCsvDate(raw) {
  // Accepts "8/15/18" -> Date(2018-08-15)
  if (!raw || typeof raw !== "string") return null;
  const parts = raw.split("/");
  if (parts.length !== 3) return null;
  const m = parseInt(parts[0], 10);
  const d = parseInt(parts[1], 10);
  const y = parseInt(parts[2], 10);
  if (Number.isNaN(m) || Number.isNaN(d) || Number.isNaN(y)) return null;
  const fullY = y < 100 ? 2000 + y : y;
  return new Date(fullY, m - 1, d);
}

(async () => {
  try {
    // 1) Connect
    await mongoose.connect(MONGO_URI, { dbName: SOURCE_DB });
    console.log(`✅ Connected to MongoDB Atlas DB: ${SOURCE_DB}`);

    // 2) Resolve demo user id
    let demoUserId;
    if (DEMO_USER_ID) {
      demoUserId = new mongoose.Types.ObjectId(DEMO_USER_ID);
      console.log(`👤 Using DEMO_USER_ID from .env: ${demoUserId}`);
    } else if (DEMO_EMAIL) {
      const found = await User.findOne({ email: DEMO_EMAIL });
      if (!found) throw new Error(`Demo user with email ${DEMO_EMAIL} not found`);
      demoUserId = found._id;
      console.log(`👤 Resolved demo user by email ${DEMO_EMAIL}: ${demoUserId}`);
    } else {
      throw new Error("Please set DEMO_USER_ID or DEMO_EMAIL in .env");
    }

    // 3) Collections
    const db = mongoose.connection.db;
    const coll = db.collection(CSV_COLLECTION);

    // 4) Iterate only docs missing userId
    const cursor = coll.find({ userId: { $exists: false } });
    let seen = 0;
    let updated = 0;
    let ops = [];

    while (await cursor.hasNext()) {
      const doc = await cursor.next();
      seen++;

      // Prepare update
      const update = { $set: { userId: demoUserId } };

      // Back-fill derived fields *if missing*
      // date / month
      if (!doc.date && doc[CSV_DATE_FIELD]) {
        const dateObj = parseCsvDate(doc[CSV_DATE_FIELD]);
        if (dateObj) {
          update.$set.date = dateObj;
          update.$set.month = parseMonthStr(dateObj);
        }
      } else if (!doc.month && doc.date instanceof Date) {
        update.$set.month = parseMonthStr(doc.date);
      }

      // absAmount / isLarge
      if (doc[CSV_AMOUNT_FIELD] !== undefined && (doc.absAmount === undefined || doc.isLarge === undefined)) {
        const amt = Number(doc[CSV_AMOUNT_FIELD]);
        if (!Number.isNaN(amt)) {
          if (doc.absAmount === undefined) update.$set.absAmount = Math.abs(amt);
          if (doc.isLarge === undefined) update.$set.isLarge = Math.abs(amt) >= LARGE_TH;
        }
      }

      // Optionally map CSV-named fields into canonical keys if missing
      if (doc[CSV_CATEGORY_FIELD] !== undefined && doc.category === undefined) {
        update.$set.category = doc[CSV_CATEGORY_FIELD];
      }
      if (doc[CSV_NOTE_FIELD] !== undefined && doc.description === undefined) {
        update.$set.description = doc[CSV_NOTE_FIELD];
      }
      if (doc[CSV_PAYMENT_FIELD] !== undefined && doc.source === undefined) {
        update.$set.source = doc[CSV_PAYMENT_FIELD];
      }
      if (doc[CSV_DAYOFWEEK_FIELD] !== undefined && doc.dayOfWeek === undefined) {
        update.$set.dayOfWeek = doc[CSV_DAYOFWEEK_FIELD];
      }

      ops.push({
        updateOne: {
          filter: { _id: doc._id, userId: { $exists: false } }, // 安全：只给未标记的打标签
          update
        }
      });

      if (ops.length >= BATCH) {
        const res = await coll.bulkWrite(ops, { ordered: false });
        updated += (res?.modifiedCount || 0) + (res?.upsertedCount || 0);
        console.log(`✏ Patched ${ops.length} docs (cumulative updated: ${updated})`);
        ops = [];
      }
    }

    if (ops.length > 0) {
      const res = await coll.bulkWrite(ops, { ordered: false });
      updated += (res?.modifiedCount || 0) + (res?.upsertedCount || 0);
      console.log(`✏ Patched remaining ${ops.length} docs (total updated: ${updated})`);
    }

    console.log(`✅ Done. Scanned: ${seen}, Updated: ${updated}.`);
    await mongoose.disconnect();
  } catch (err) {
    console.error("❌ Error in linkCsvToDemoUser:", err);
    process.exit(1);
  }
})();
