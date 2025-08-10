// server/config/db.js
const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI missing');

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000, // 10s 快速失败
  });

  console.log('[db] connected:', mongoose.connection.name);
};

module.exports = { connectDB };
