/**
 * Summary service: MongoDB aggregation to compute monthly totals,
 * by-category and by-day breakdowns for dashboard.
 */
const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const { getMonthRange } = require('../utils/date');

exports.getMonthlySummary = async (userId, month) => {
  const match = { userId: mongoose.Types.ObjectId.createFromHexString(userId) };
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
              expense: { $sum: { $cond: [{ $lt: ['$amount', 0] }, '$amount', 0] } }
            }
          },
          {
            $project: {
              _id: 0,
              income: 1,
              expense: { $multiply: ['$expense', -1] },
              net: { $subtract: ['$income', { $multiply: ['$expense', -1] }] }
            }
          }
        ],
        byCategory: [
          {
            $group: {
              _id: '$category',
              expense: { $sum: { $cond: [{ $lt: ['$amount', 0] }, { $multiply: ['$amount', -1] }, 0] } },
              income: { $sum: { $cond: [{ $gt: ['$amount', 0] }, '$amount', 0] } }
            }
          },
          { $sort: { expense: -1 } }
        ],
        byDay: [
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
              expense: { $sum: { $cond: [{ $lt: ['$amount', 0] }, { $multiply: ['$amount', -1] }, 0] } },
              income: { $sum: { $cond: [{ $gt: ['$amount', 0] }, '$amount', 0] } }
            }
          },
          { $sort: { _id: 1 } }
        ]
      }
    }
  ];

  const [res] = await Transaction.aggregate(pipeline);
  return {
    totals: res?.totals?.[0] || { income: 0, expense: 0, net: 0 },
    byCategory: res?.byCategory || [],
    byDay: res?.byDay || []
  };
};
