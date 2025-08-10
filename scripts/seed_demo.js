// scripts/seed_demo.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');
const bcrypt = require('bcrypt');
const parse = require('csv-parse/sync').parse;

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
const MONGO_DB    = process.env.MONGO_DB || 'fintrack';

// 演示账号
const DEMO_EMAIL = 'alex@demo.com';
const DEMO_NAME  = 'Alex';
const DEMO_PASS  = '123456';

// CSV 路径（将你的 CSV 改名为 transactions.csv 放到 /data 目录）
const CSV_PATH = path.join(__dirname, '..', 'data', 'transactions.csv');

// 解析 m/d/yy 或 m/d/yyyy → Date
function parseMDY(mdy) {
  const parts = String(mdy).split('/');
  if (parts.length !== 3) return new Date(NaN);
  let [m, d, y] = parts.map(s => s.trim());
  if (y.length === 2) y = '20' + y; // 假定 20yy
  return new Date(Number(y), Number(m) - 1, Number(d));
}

(async () => {
  if (!fs.existsSync(CSV_PATH)) {
    console.error('❌ CSV 文件未找到：', CSV_PATH);
    process.exit(1);
  }

  const csvRaw = fs.readFileSync(CSV_PATH);
  const rows = parse(csvRaw, { columns: true, trim: true });

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(MONGO_DB);
  const users = db.collection('users');
  const tx    = db.collection('transactions');

  await users.createIndex({ email: 1 }, { unique: true });
  await tx.createIndex({ userId: 1, date: -1 });

  // 创建或获取 Alex
  let user = await users.findOne({ email: DEMO_EMAIL });
  if (!user) {
    const passwordHash = await bcrypt.hash(DEMO_PASS, 10);
    const res = await users.insertOne({
      email: DEMO_EMAIL,
      passwordHash,
      name: DEMO_NAME,
      createdAt: new Date()
    });
    user = { _id: res.insertedId, email: DEMO_EMAIL, name: DEMO_NAME };
    console.log('✅ 已创建用户 Alex:', DEMO_EMAIL);
  } else {
    console.log('ℹ️ 用户已存在:', DEMO_EMAIL);
  }

  const userId = String(user._id);

  // 清理 Alex 旧交易（仅 demo）
  await tx.deleteMany({ userId });

  // 映射 CSV → Mongo 文档
  const docs = rows.map(r => {
    const amountNum = Number(r['Amount']);
    return {
      userId,
      date: parseMDY(r['Posting Date']),
      amount: amountNum,                               // 支出为负、收入为正
      type: amountNum >= 0 ? 'income' : 'expense',
      category: r['Category'] || 'Other',
      source: r['Source'] || 'Unknown',
      description: r['Description'] || '',
      createdAt: new Date()
    };
  });

  // 过滤无效日期
  const validDocs = docs.filter(d => !isNaN(d.date.getTime()));

  if (validDocs.length) {
    await tx.insertMany(validDocs);
  }
  console.log(`✅ 已为 Alex 导入交易：${validDocs.length} 条`);

  await client.close();
  console.log('✅ 完成。现在可以用 alex@demo.com / 123456 登录。');
})();
