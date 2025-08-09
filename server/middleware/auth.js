// server/middleware/auth.js
const { verifyJwt } = require('../utils/helpers');

module.exports = function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) return res.status(401).json({ message: 'Missing token' });
  try {
    const payload = verifyJwt(token);
    req.userId = payload.uid; // 给 Joe 的接口用作数据隔离
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};
