// server/utils/validators.js

/** Validate transaction payload fields (lightweight) */
exports.assertTransactionPayload = (p) => {
  if (!p) throw new Error('Missing body');
  if (!p.date) throw new Error('date is required');
  if (p.amount === undefined || p.amount === null || isNaN(Number(p.amount))) {
    throw new Error('amount must be a number');
  }
  if (!p.type || !['expense', 'income'].includes(p.type)) {
    throw new Error('type must be expense or income');
  }
  if (!p.category) throw new Error('category is required');
};
