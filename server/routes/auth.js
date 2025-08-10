// server/routes/auth.js
const router = require('express').Router();
const ctrl = require('../controllers/authCtrl');

router.post('/login', ctrl.login);
router.post('/logout', ctrl.logout);
router.post('/register', ctrl.register); // optional

module.exports = router;
