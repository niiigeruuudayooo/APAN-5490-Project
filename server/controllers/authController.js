// server/controllers/authController.js
const { findByEmail, createUser } = require('../models/User');
const { isValidEmail, isStrongPassword } = require('../utils/validators');
const { hashPassword, comparePassword, signJwt } = require('../utils/helpers');
const { initTenantForUser } = require('../services/tenantService');

async function signup(req, res) {
  try {
    const { email, password, name } = req.body || {};
    if (!isValidEmail(email)) return res.status(400).json({ message: 'Invalid email' });
    if (!isStrongPassword(password)) return res.status(400).json({ message: 'Weak password (>=6)' });

    const exists = await findByEmail(email);
    if (exists) return res.status(409).json({ message: 'Email already registered' });

    const passwordHash = await hashPassword(password);
    const user = await createUser({ email, passwordHash, name });
    const token = signJwt({ uid: String(user._id) });

    await initTenantForUser(String(user._id));

    res.status(201).json({
      token,
      user: { id: String(user._id), email: user.email, name: user.name }
    });
  } catch (err) {
    console.error('signup error:', err);
    res.status(500).json({ message: 'Server error' });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body || {};
    if (!isValidEmail(email)) return res.status(400).json({ message: 'Invalid email' });

    const user = await findByEmail(email);
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const ok = await comparePassword(password, user.passwordHash);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

    const token = signJwt({ uid: String(user._id) });
    res.json({
      token,
      user: { id: String(user._id), email: user.email, name: user.name }
    });
  } catch (err) {
    console.error('login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
}

// 课堂 demo 简版：不发邮件，只返回 ok
async function forgotPassword(req, res) {
  try {
    const { email } = req.body || {};
    if (!isValidEmail(email)) return res.status(400).json({ message: 'Invalid email' });
    res.json({ ok: true });
  } catch (err) {
    console.error('forgot error:', err);
    res.status(500).json({ message: 'Server error' });
  }
}

module.exports = { signup, login, forgotPassword };