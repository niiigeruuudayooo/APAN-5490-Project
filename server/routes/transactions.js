const router = require('express').Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/transactionsCtrl');
const summaryService = require('../services/summaryService');

// list / create / delete
router.get('/', auth, ctrl.list);
router.post('/', auth, ctrl.create);
router.delete('/:id', auth, ctrl.remove);

// dashboard summary (income/expense/category/day)
router.get('/summary', auth, async (req, res) => {
  const { month } = req.query;
  const out = await summaryService.getMonthlySummary(req.userId, month);
  res.json(out);
});

module.exports = router;
