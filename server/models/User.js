// server/models/User.js
const { getCollection } = require('../db/connect');

const Users = () => getCollection('users');

async function findByEmail(email) {
  return Users().findOne({ email });
}

async function createUser({ email, passwordHash, name }) {
  const doc = { email, passwordHash, name: name || '', createdAt: new Date() };
  const res = await Users().insertOne(doc);
  return { _id: res.insertedId, ...doc };
}

module.exports = { findByEmail, createUser };
