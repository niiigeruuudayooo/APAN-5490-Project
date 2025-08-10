require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { connectDB } = require('./config/db');

const app = express();
app.use(cors());
app.use(express.json());

// 简单健康检查：1 表示 connected
app.get('/health/db', (req, res) => {
    res.json({ mongoState: mongoose.connection.readyState }); // 1=connected
});

// 可选：真正 ping 一下数据库
app.get('/api/ping', async (req, res) => {
    try {
        const admin = mongoose.connection.db.admin();
        const r = await admin.ping(); // { ok: 1 }
        res.json({ ok: true, r });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// 先连库再启动
connectDB()
    .then(() => {
        const port = process.env.PORT || 3000;
        app.listen(port, () => console.log(`🚀 http://localhost:${port}`));
    })
    .catch((err) => {
        console.error('❌ Failed to connect DB:', err);
        process.exit(1); // 启动失败直接退出（避免假活着）
    });