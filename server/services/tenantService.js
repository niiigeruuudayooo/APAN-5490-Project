// server/services/tenantService.js
// Demo 里做占位：初始化用户偏好等；如果你想“注册即导入CSV”，也可以在这里做
const { getCollection } = require('../db/connect');

async function initTenantForUser(userId) {
  const prefs = getCollection('user_prefs');
  await prefs.updateOne(
    { userId },
    { $setOnInsert: { userId, currency: 'USD', createdAt: new Date() } },
    { upsert: true }
  );
}

module.exports = { initTenantForUser };
