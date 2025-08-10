// server/controllers/budgetsCtrl.js
const Budget = require('../models/Budget');
const { getMonthRange } = require('../utils/date');
const summaryService = require('../services/summaryService');

/** GET /api/budgets?month=YYYY-MM */
exports.getByMonth = async (req, res) => {
  const { month } = req.query;
  if (!month) return res.status(400).json({ message: 'month (YYYY-MM) required' });

  const budget = await Budget.findOne({ userId: req.userId, month }).lean();
  const summary = await summaryService.getMonthlySummary(req.userId, month);

  res.json({ budget: budget || { month, limits: {}, monthlySavingTarget: 0 }, summary });
};

/** POST /api/budgets */
exports.save = async (req, res) => {
  const { month, limits = {}, monthlySavingTarget = 0 } = req.body || {};
  if (!month) return res.status(400).json({ message: 'month (YYYY-MM) required' });

  const doc = await Budget.findOneAndUpdate(
    { userId: req.userId, month },
    { $set: { limits, monthlySavingTarget } },
    { new: true, upsert: true }
  );

  res.status(201).json(doc);
};
