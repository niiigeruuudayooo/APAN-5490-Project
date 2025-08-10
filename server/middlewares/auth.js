// server/middlewares/auth.js
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

module.exports = function auth(req, res, next) {
  const cookieToken = req.cookies?.token;
  const header = req.headers.authorization;
  const bearer = header && header.startsWith('Bearer ') ? header.split(' ')[1] : null;

  const token = cookieToken || bearer;
  if (!token) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.sub; // attach user id for downstream queries
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};
