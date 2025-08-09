/**
 * Auth controller: login/logout (+ optional register).
 */
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const JWT_EXPIRES_IN = '2h';

exports.register = async (req, res) => {
  try {
    const { email, password, name } = req.body || {};
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ message: 'Email already registered' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ email, passwordHash, name: name || '' });

    res.status(201).json({ id: user._id, email: user.email, name: user.name });
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ sub: user._id.toString(), name: user.name }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    // safer: HttpOnly cookie
    res.cookie('token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false, // set true on HTTPS in production
      maxAge: 2 * 60 * 60 * 1000
    });

    res.json({ message: 'ok', user: { id: user._id, name: user.name, email: user.email } });
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.logout = (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'logged out' });
};
