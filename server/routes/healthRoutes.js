// server/routes/healthRoutes.js
const express = require('express');
const router = express.Router();

router.get('/healthz', (req, res) => res.json({ ok: true }));

module.exports = router;
