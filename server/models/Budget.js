// server/models/Budget.js
const mongoose = require('mongoose');

const BudgetSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true },
    month: { type: String, required: true }, // 'YYYY-MM'
    limits: { type: Object, default: {} },   // e.g. { Food: 300, Rent: 2000, ... }
    monthlySavingTarget: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Ensure a single budget doc per user per month
BudgetSchema.index({ userId: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('Budget', BudgetSchema);
