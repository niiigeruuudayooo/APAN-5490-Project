// server/utils/validators.js
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').toLowerCase());
}
function isStrongPassword(pwd) {
  return typeof pwd === 'string' && pwd.length >= 6; // demo 标准
}
module.exports = { isValidEmail, isStrongPassword };
