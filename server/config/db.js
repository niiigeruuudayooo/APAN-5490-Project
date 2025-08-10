// server/config/db.js
const mongoose = require('mongoose');

/**
 * Connect to MongoDB Atlas.
 * Make sure MONGO_URI in .env is your Atlas connection string, e.g.:
 * mongodb+srv://<user>:<pass>@<cluster>/<db>?retryWrites=true&w=majority
 */
module.exports = async function connectDB() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('❌ Missing MONGO_URI in .env');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri, {
      // modern Mongoose no longer needs useNewUrlParser/useUnifiedTopology explicitly
      maxPoolSize: 10,
    });
    console.log('✅ MongoDB (Atlas) connected');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  }
};
