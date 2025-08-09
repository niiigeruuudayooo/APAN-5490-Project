/**
 * User model: stores login credentials (hashed) and profile basics.
 */
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, unique: true, required: true, index: true },
    passwordHash: { type: String, required: true },
    name: { type: String }
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', UserSchema);
