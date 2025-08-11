/**
 * Link existing CSV data in MongoDB Atlas to the demo user by adding userId and normalizing fields
 * Author: Jonas He (modified with cloud CSV support)
 */

const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

const User = require("../models/User");
const Transaction = require("../models/Transaction");

const {
  MONGO_URI,
  DEMO_EMAIL,
  SOURCE_DB,
  CSV_COLLECTION,
  MODE,
  TARGET_COLLECTION,
  CSV_DATE_FIELD,
  CSV_AMOUNT_FIELD,
  CSV_CATEGORY_FIELD,
  CSV_NOTE_FIELD,
  CSV_PAYMENT_FIELD,
  CSV_DAYOFWEEK_FIELD,
  CLEAR_BEFORE,
  IS_LARGE_THRESHOLD,
  BATCH_SIZE
} = process.env;

(async () => {
  try {
    // Connect to MongoDB Atlas
    await mongoose.connect(MONGO_URI, { dbName: SOURCE_DB });
    console.log(`✅ Connected to MongoDB Atlas: ${SOURCE_DB}`);

    // Find demo user
    const demoUser = await User.findOne({ email: DEMO_EMAIL });
    if (!demoUser) {
      throw new Error(`Demo user with email ${DEMO_EMAIL} not found.`);
    }
    console.log(`👤 Found demo user: ${demoUser.name} (${demoUser._id})`);

    // Get source collection (raw CSV data)
    const db = mongoose.connection.db;
    const sourceCollection = db.collection(CSV_COLLECTION);

    // Target collection
    let targetCollection;
    if (MODE === "copy") {
      targetCollection = db.collection(TARGET_COLLECTION);
      if (CLEAR_BEFORE === "true") {
        await targetCollection.deleteMany({ userId: demoUser._id });
        console.log(`🗑 Cleared old data in ${TARGET_COLLECTION} for demo user`);
      }
    } else {
      targetCollection = sourceCollection; // patch mode updates in-place
    }

    // Cursor to iterate source data
    const cursor = sourceCollection.find({});
    let batch = [];
    let ops = [];
    const batchSize = parseInt(BATCH_SIZE) || 1000;

    while (await cursor.hasNext()) {
      const doc = await cursor.next();

      // Parse date field
      const rawDate = doc[CSV_DATE_FIELD];
      let dateObj = null;
      let monthStr = null;
      if (rawDate) {
        // Handle format like 8/15/18
        const [m, d, y] = rawDate.split("/").map(v => parseInt(v));
        const fullYear = y < 100 ? 2000 + y : y; // handle YY format
        dateObj = new Date(fullYear, m - 1, d);
        monthStr = `${fullYear}-${String(m).padStart(2, "0")}`;
      }

      // Amount (keep sign)
      const amount = Number(doc[CSV_AMOUNT_FIELD]);
      const absAmount = Math.abs(amount);

      // New transaction document
      const normalized = {
        userId: demoUser._id,
        date: dateObj,
        month: monthStr,
        amount,
        absAmount,
        isLarge: absAmount >= (parseFloat(IS_LARGE_THRESHOLD) || 1000),
        category: doc[CSV_CATEGORY_FIELD] || "",
        description: doc[CSV_NOTE_FIELD] || "",
        source: doc[CSV_PAYMENT_FIELD] || "",
        dayOfWeek: doc[CSV_DAYOFWEEK_FIELD] || ""
      };

      if (MODE === "copy") {
        batch.push(normalized);
        if (batch.length >= batchSize) {
          await targetCollection.insertMany(batch, { ordered: false });
          console.log(`📥 Inserted ${batch.length} docs into ${TARGET_COLLECTION}`);
          batch = [];
        }
      } else {
        ops.push({
          updateOne: {
            filter: { _id: doc._id },
            update: { $set: normalized }
          }
        });
        if (ops.length >= batchSize) {
          await targetCollection.bulkWrite(ops, { ordered: false });
          console.log(`✏ Updated ${ops.length} docs in ${CSV_COLLECTION}`);
          ops = [];
        }
      }
    }

    // Final flush
    if (MODE === "copy" && batch.length > 0) {
      await targetCollection.insertMany(batch, { ordered: false });
      console.log(`📥 Inserted remaining ${batch.length} docs`);
    }
    if (MODE !== "copy" && ops.length > 0) {
      await targetCollection.bulkWrite(ops, { ordered: false });
      console.log(`✏ Updated remaining ${ops.length} docs`);
    }

    console.log("✅ Linking CSV data to demo user completed!");
    await mongoose.disconnect();
  } catch (err) {
    console.error("❌ Error:", err);
    process.exit(1);
  }
})();
