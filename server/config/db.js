/**
 * MongoDB connection helper (Mongoose).
 */
const mongoose = require('mongoose');

let hasConnected = false;

async function connectDB() {
    if (hasConnected) return mongoose.connection;

    const uri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/fintrack';
    if (!uri) throw new Error('Missing MONGODB_URI or MONGO_URI');

    await mongoose.connect(uri, {
        dbName: process.env.MONGODB_DB || 'fintrack',
        serverSelectionTimeoutMS: 5000,
        maxPoolSize: 10,
    });

    hasConnected = true;
    console.log('✅ MongoDB connected');

    mongoose.connection.on('error', (err) => {
        console.error('❌ MongoDB error:', err);
    });

    return mongoose.connection;
}

module.exports = connectDB;
