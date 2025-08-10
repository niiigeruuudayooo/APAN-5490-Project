// server/routes/budgets.js
const router = require('express').Router();
const auth = require('../middlewares/auth');
const ctrl = require('../controllers/budgetsCtrl');

router.get('/', auth, ctrl.getByMonth);
router.post('/', auth, ctrl.save);

module.exports = router;
