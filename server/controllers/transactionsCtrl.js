/**
 * Transactions controller: list, create, delete.
 * NOTE: all actions are scoped by req.userId from auth middleware.
 */
const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const { validateTransactionPayload } = require('../utils/validators');
const { getMonthRange } = require('../utils/date');

exports.list = async (req, res) => {
  const { month, category, search } = req.query;
  const filter = { userId: req.userId };

  if (month) {
    const { start, end } = getMonthRange(month);
    filter.date = { $gte: start, $lt: end };
  }
  if (category) filter.category = category;
  if (search) filter.note = { $regex: search, $options: 'i' };

  const rows = await Transaction.find(filter).sort({ date: -1 }).lean();
  res.json(rows);
};

exports.create = async (req, res) => {
  const payload = req.body || {};
  const { valid, message, data } = validateTransactionPayload(payload);
  if (!valid) return res.status(400).json({ message });

  const doc = await Transaction.create({
    userId: req.userId,
    date: new Date(data.date),
    amount: data.amount,          // already normalized sign by validator
    type: data.type,
    category: data.category,
    paymentMethod: data.paymentMethod || '',
    note: data.note || ''
  });
  res.status(201).json(doc);
};

exports.remove = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid id' });

  await Transaction.deleteOne({ _id: id, userId: req.userId });
  res.json({ ok: true });
};
