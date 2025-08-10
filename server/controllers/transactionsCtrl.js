// server/controllers/transactionsCtrl.js
const Transaction = require('../models/Transaction');
const { getMonthRange } = require('../utils/date');
const { assertTransactionPayload } = require('../utils/validators');

/** GET /api/transactions?month=YYYY-MM&category=...&search=... */
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

/** POST /api/transactions */
exports.create = async (req, res) => {
  const body = req.body || {};
  try {
    assertTransactionPayload(body);

    // normalize sign convention: expense -> negative, income -> positive
    let amount = Number(body.amount);
    if (body.type === 'expense' && amount > 0) amount = -amount;
    if (body.type === 'income' && amount < 0) amount = Math.abs(amount);

    const doc = await Transaction.create({
      userId: req.userId,
      date: new Date(body.date),
      amount,
      type: body.type,
      category: body.category,
      paymentMethod: body.paymentMethod || 'debit',
      note: body.note || '',
    });

    res.status(201).json(doc);
  } catch (err) {
    res.status(400).json({ message: err.message || 'Invalid payload' });
  }
};

/** DELETE /api/transactions/:id */
exports.remove = async (req, res) => {
  await Transaction.deleteOne({ _id: req.params.id, userId: req.userId });
  res.json({ ok: true });
};
