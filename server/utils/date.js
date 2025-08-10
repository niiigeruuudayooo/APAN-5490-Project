// server/utils/date.js

/** Return first day (inclusive) and next month's first day (exclusive) */
exports.getMonthRange = (yyyyMM) => {
  // yyyyMM expected format: 'YYYY-MM'
  const [y, m] = yyyyMM.split('-').map(Number);
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 1);
  return { start, end };
};
