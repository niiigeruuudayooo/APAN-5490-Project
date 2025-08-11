// server/seed/linkCsvToDemoUser.js
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');

(async () => {
  try {
    await connectDB();

    // 1) 找到 demo 用户
    const demo = await User.findOne({ email: 'demo@fintrack.com' });
    if (!demo) {
      console.error('❌ Demo user not found. Run server/seed/createDemoUser.js first.');
      process.exit(1);
    }

    // 2) 访问 fintrack DB 的 transactions 集合
    //    如果你的连接串已经指到 fintrack，这里直接用 connection.db 即可；
    //    为保险，这里显式 useDb 一下：
    const db = mongoose.connection.useDb('fintrack');
    const col = db.collection('transactions');

    // 3) 只处理还没有 userId 的文档
    const cursor = col.find({ userId: { $exists: false } });

    let updated = 0;
    while (await cursor.hasNext()) {
      const doc = await cursor.next();

      // 取出当前字段（你 CSV 导入后就是这些小写键）
      const dateStr = doc.date;                 // 例如 "2025-08-08"
      const category = doc.category || 'Other';
      const description = doc.description || '';
      const source = doc.source || 'Unknown';

      // 解析日期：字符串 -> Date
      const date = dateStr ? new Date(dateStr) : new Date();

      // 规范化金额 & 类型
      let amount = Number(doc.amount || 0);
      let type = amount < 0 ? 'expense' : 'income';
      if (type === 'expense' && amount > 0) amount = -amount;
      if (type === 'income' && amount < 0) amount = Math.abs(amount);

      await col.updateOne(
        { _id: doc._id },
        {
          $set: {
            userId: demo._id,            // 绑定 demo 用户
            date,                        // 真·Date 类型
            amount,                      // Number（支出为负、收入为正）
            type,                        // 'expense' | 'income'
            category,                    // 分类
            paymentMethod: source,       // 映射 source -> paymentMethod
            note: description            // 映射 description -> note
          }
        }
      );

      updated++;
    }

    console.log(`✅ Linked ${updated} transactions to demo user (${demo.email}).`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
})();
