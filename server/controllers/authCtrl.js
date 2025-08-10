// server/controllers/authCtrl.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const EXP = process.env.JWT_EXPIRES_IN || '2h';

/** POST /api/auth/login */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ sub: user._id.toString(), name: user.name }, JWT_SECRET, { expiresIn: EXP });

    res.cookie('token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false, // set true behind HTTPS in production
      maxAge: 2 * 60 * 60 * 1000,
    });

    res.json({ message: 'ok', user: { id: user._id, name: user.name, email: user.email } });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

/** POST /api/auth/logout */
exports.logout = (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'logged out' });
};

/** POST /api/auth/register (optional) */
exports.register = async (req, res) => {
  try {
    const { email, password, name = '' } = req.body || {};
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ message: 'Email already in use' });

    const passwordHash = await bcrypt.hash(password, 10);
    const u = await User.create({ email, passwordHash, name });
    res.status(201).json({ id: u._id, email: u.email, name: u.name });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
