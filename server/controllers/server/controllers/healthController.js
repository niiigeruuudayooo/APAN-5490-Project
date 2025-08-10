// server/controllers/healthController.js
async function getDbStatus(req, res) {
  try {
    const mongoose = require('mongoose');
    const state = mongoose.connection.readyState;

    // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
    const states = ['Disconnected', 'Connected', 'Connecting', 'Disconnecting'];
    res.status(200).json({
      status: states[state] || 'Unknown'
    });
  } catch (err) {
    res.status(500).json({ status: 'Error', error: err.message });
  }
}

function ping(req, res) {
  res.status(200).json({ message: 'Pong' });
}

module.exports = {
  getDbStatus,
  ping
};
