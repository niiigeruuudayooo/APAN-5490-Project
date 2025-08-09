/**
 * Simple input validation helpers for transactions, etc.
 */
exports.validateTransactionPayload = (payload = {}) => {
  const { date, amount, type, category, paymentMethod, note } = payload;
  if (!date) return { valid: false, message: 'date is required' };
  if (amount === undefined || amount === null || isNaN(Number(amount)))
    return { valid: false, message: 'amount must be a number' };
  if (!type || !['expense', 'income'].includes(type))
    return { valid: false, message: 'type must be expense or income' };
  if (!category) return { valid: false, message: 'category is required' };

  // Normalize sign: expense negative, income positive
  let normalizedAmount = Number(amount);
  if (type === 'expense' && normalizedAmount > 0) normalizedAmount = -normalizedAmount;
  if (type === 'income' && normalizedAmount < 0) normalizedAmount = Math.abs(normalizedAmount);

  return {
    valid: true,
    message: 'ok',
    data: { date, amount: normalizedAmount, type, category, paymentMethod, note }
  };
};
