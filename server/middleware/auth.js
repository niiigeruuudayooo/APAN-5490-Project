/**
 * JWT auth middleware: read token from HttpOnly cookie (or Authorization header),
 * verify, and inject req.userId for downstream controllers.
 */
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
    req.userId = payload.sub;
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};
