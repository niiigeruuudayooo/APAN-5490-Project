/**
 * Date helpers: month range, format YYYY-MM-DD.
 */
exports.getMonthRange = (yyyyMM) => {
  // yyyyMM like '2025-07'
  const [y, m] = yyyyMM.split('-').map(Number);
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 1);
  return { start, end };
};

exports.toYMD = (d) => {
  const pad = (n) => (n < 10 ? '0' + n : '' + n);
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  return `${y}-${m}-${day}`;
};
