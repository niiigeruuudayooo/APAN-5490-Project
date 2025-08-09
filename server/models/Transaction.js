/**
 * Transaction model: per-user income/expense records.
 * Convention: expense can be negative amount; income positive.
 * Or rely on `type` + absolute amount; here we store signed amounts.
 */
const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true },
    date: { type: Date, required: true },
    amount: { type: Number, required: true }, // negative for expense, positive for income
    type: { type: String, enum: ['expense', 'income'], required: true },
    category: { type: String, required: true },
    paymentMethod: { type: String }, // 'debit','credit','cash','bank'...
    note: { type: String }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Transaction', TransactionSchema);
