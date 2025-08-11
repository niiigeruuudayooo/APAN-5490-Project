// server/controllers/transactionsCtrl.js
const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const { getMonthRange } = require('../utils/date');
const { assertTransactionPayload } = require('../utils/validators');

/**
 * GET /api/transactions?month=YYYY-MM&category=...&search=...&page=1&limit=50
 * 返回：按日期倒序、当前用户的交易列表
 */
exports.list = async (req, res) => {
  try {
    const { month, category, search } = req.query;
    // 简单分页（可选）
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || '50', 10), 1), 200);
    const skip = (page - 1) * limit;

    const filter = { userId: req.userId };

    if (month) {
      const { start, end } = getMonthRange(month); // 若 month 非法，这里会 throw
      filter.date = { $gte: start, $lt: end };
    }

    if (category) filter.category = String(category).trim();

    // 更宽的搜索：note / category / paymentMethod 任一匹配
    if (search) {
      const re = new RegExp(String(search).trim(), 'i');
      filter.$or = [
        { note: re },
        { category: re },
        { paymentMethod: re },
      ];
    }

    const [rows, total] = await Promise.all([
      Transaction.find(filter).sort({ date: -1 }).skip(skip).limit(limit).lean(),
      Transaction.countDocuments(filter),
    ]);

    res.json({
      page,
      limit,
      total,
      rows,
    });
  } catch (err) {
    res.status(400).json({ message: err.message || 'Bad request' });
  }
};

/**
 * POST /api/transactions
 * body: { date, amount, type, category, paymentMethod?, note? }
 */
exports.create = async (req, res) => {
  try {
    const body = req.body || {};
    assertTransactionPayload(body); // 校验字段是否齐全、格式是否正确

    // 规范化金额正负：expense -> negative, income -> positive
    let amount = Number(body.amount);
    if (body.type === 'expense' && amount > 0) amount = -amount;
    if (body.type === 'income' && amount < 0) amount = Math.abs(amount);

    const doc = await Transaction.create({
      userId: req.userId,
      date: new Date(body.date), // 建议前端传 ISO 或 YYYY-MM-DD（并在 validator 做检查）
      amount,
      type: body.type,
      category: String(body.category).trim(),
      paymentMethod: (body.paymentMethod ? String(body.paymentMethod) : 'debit').trim(),
      note: (body.note ? String(body.note) : '').trim(),
    });

    res.status(201).json(doc);
  } catch (err) {
    res.status(400).json({ message: err.message || 'Invalid payload' });
  }
};

/**
 * DELETE /api/transactions/:id
 */
exports.remove = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid id' });
    }

    const result = await Transaction.deleteOne({ _id: id, userId: req.userId });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Not found' });
    }

    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ message: err.message || 'Bad request' });
  }
};
