// server/services/summaryService.js
const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const { getMonthRange } = require('../utils/date');

/**
 * Return monthly summary for a user:
 * - totals: { income, expense, net }
 * - byCategory: [{ _id: 'Food', expense, income }, ...]
 * - byDay: [{ _id: 'YYYY-MM-DD', expense, income }, ...]
 */
exports.getMonthlySummary = async (userId, month) => {
  const match = { userId: new mongoose.Types.ObjectId(userId) };
  if (month) {
    const { start, end } = getMonthRange(month);
    match.date = { $gte: start, $lt: end };
  }

  const pipeline = [
    { $match: match },
    {
      $facet: {
        totals: [
          {
            $group: {
              _id: null,
              income: { $sum: { $cond: [{ $gt: ['$amount', 0] }, '$amount', 0] } },
              expense: { $sum: { $cond: [{ $lt: ['$amount', 0] }, '$amount', 0] } },
            },
          },
          {
            $project: {
              _id: 0,
              income: 1,
              expense: { $multiply: ['$expense', -1] },
              net: { $subtract: ['$income', { $multiply: ['$expense', -1] }] },
            },
          },
        ],
        byCategory: [
          {
            $group: {
              _id: '$category',
              expense: { $sum: { $cond: [{ $lt: ['$amount', 0] }, { $multiply: ['$amount', -1] }, 0] } },
              income: { $sum: { $cond: [{ $gt: ['$amount', 0] }, '$amount', 0] } },
            },
          },
          { $sort: { expense: -1 } },
        ],
        byDay: [
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
              expense: { $sum: { $cond: [{ $lt: ['$amount', 0] }, { $multiply: ['$amount', -1] }, 0] } },
              income: { $sum: { $cond: [{ $gt: ['$amount', 0] }, '$amount', 0] } },
            },
          },
          { $sort: { _id: 1 } },
        ],
      },
    },
  ];

  const [out] = await Transaction.aggregate(pipeline);
  return {
    totals: out?.totals?.[0] || { income: 0, expense: 0, net: 0 },
    byCategory: out?.byCategory || [],
    byDay: out?.byDay || [],
  };
};
