const router = require('express').Router();
const { register, login, logout } = require('../controllers/authCtrl');

router.post('/register', register); // optional
router.post('/login', login);
router.post('/logout', logout);

module.exports = router;
