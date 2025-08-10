// server/routes/transactions.js
const router = require('express').Router();
const auth = require('../middlewares/auth');
const ctrl = require('../controllers/transactionsCtrl');
const summaryService = require('../services/summaryService');

/** Protected routes */
router.get('/', auth, ctrl.list);
router.post('/', auth, ctrl.create);
router.delete('/:id', auth, ctrl.remove);

/** Monthly summary for dashboard: /api/transactions/summary?month=YYYY-MM */
router.get('/summary', auth, async (req, res) => {
  const { month } = req.query;
  const summary = await summaryService.getMonthlySummary(req.userId, month);
  res.json(summary);
});

module.exports = router;
