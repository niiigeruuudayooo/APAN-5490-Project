// server/utils/helpers.js
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/** 生成 JWT（给登录成功后用） */
function signJwt(payload, options = {}) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN, ...options });
}

/** 校验 JWT（auth 中间件会用到） */
function verifyJwt(token) {
    return jwt.verify(token, JWT_SECRET); // 返回 payload
}

/** 包一层 async handler，统一把异常丢给 next() */
function asyncHandler(fn) {
    return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

/** 简单“深拷贝/脱敏”工具，去掉 Mongoose 元数据 */
function sanitize(doc) {
    return JSON.parse(JSON.stringify(doc));
}

module.exports = {
    signJwt,
    verifyJwt,
    asyncHandler,
    sanitize,
};
