// server/middlewares/auth.js
const jwt = require('jsonwebtoken');
const { verifyJwt } = require('../utils/helpers');
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

/**
 * Auth middleware
 * - 优先从 HttpOnly cookie 获取 token
 * - 其次从 Authorization Bearer 获取 token
 * - 先尝试用 verifyJwt 验证 (Atlas Link 版)
 * - 如果失败则用 jsonwebtoken 验证 (课友版)
 */
module.exports = function auth(req, res, next) {
  // 1. 从 Cookie 或 Header 获取 token
  const cookieToken = req.cookies?.token;
  const header = req.headers.authorization || '';
  const bearerToken = header.startsWith('Bearer ') ? header.slice(7) : null;

  const token = cookieToken || bearerToken;
  if (!token) return res.status(401).json({ message: 'Missing token' });

  try {
    let payload;

    // 2. 优先使用 Atlas Link 版 verifyJwt
    try {
      payload = verifyJwt(token);
      req.userId = payload.uid; // Joe 的版本数据隔离字段
    } catch {
      // 3. Fallback 到课友版 JWT 验证
      payload = jwt.verify(token, JWT_SECRET);
      req.userId = payload.sub; // 课友版用 sub
    }

    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};
