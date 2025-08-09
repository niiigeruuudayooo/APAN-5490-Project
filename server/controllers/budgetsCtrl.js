/**
 * Budgets controller: get & save monthly budgets.
 */
const Budget = require('../models/Budget');
const { getMonthRange } = require('../utils/date');
const summaryService = require('../services/summaryService');

exports.getByMonth = async (req, res) => {
  const { month } = req.query;
  if (!month) return res.status(400).json({ message: 'month (YYYY-MM) is required' });

  const budget = await Budget.findOne({ userId: req.userId, month }).lean();
  // add live spend summary for the same month
  const summary = await summaryService.getMonthlySummary(req.userId, month);

  res.json({ budget: budget || null, summary });
};

exports.save = async (req, res) => {
  const { month, limits, monthlySavingTarget } = req.body || {};
  if (!month) return res.status(400).json({ message: 'month is required' });

  const doc = await Budget.findOneAndUpdate(
    { userId: req.userId, month },
    { $set: { limits: limits || {}, monthlySavingTarget: Number(monthlySavingTarget) || 0 } },
    { new: true, upsert: true }
  );
  res.json(doc);
};
