// server/config/db.js
const mongoose = require('mongoose');

module.exports = async function connectDB() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ Missing MONGO_URI / MONGODB_URI in .env');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000, // 10s 快速失败，便于定位 Atlas 连通性
      maxPoolSize: 10,
    });

    const { name, host } = mongoose.connection;
    console.log(`✅ MongoDB (Atlas) connected → db: ${name}, host: ${host}`);

    // 可选：事件日志（方便排查偶发断线）
    mongoose.connection.on('disconnected', () => console.warn('⚠️  MongoDB disconnected'));
    mongoose.connection.on('error', (e) => console.error('❌ Mongo error:', e.message));
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  }
};
