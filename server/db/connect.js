// server/db/connect.js
const { MongoClient } = require('mongodb');

let client;
let db;

async function connectMongo(uri, dbName) {
  if (db) return db;
  client = new MongoClient(uri, { maxPoolSize: 10 });
  await client.connect();
  db = client.db(dbName);

  // 基础索引
  await db.collection('users').createIndex({ email: 1 }, { unique: true });

  console.log(`[MongoDB] connected -> ${dbName}`);
  return db;
}

function getDb() {
  if (!db) throw new Error('MongoDB not connected yet');
  return db;
}

function getCollection(name) {
  return getDb().collection(name);
}

module.exports = { connectMongo, getDb, getCollection };
