const mongoose = require('mongoose');

const AuthStateSchema = new mongoose.Schema({
  key: { type: String, unique: true },
  value: { type: mongoose.Mixed }
});

module.exports = mongoose.model('AuthState', AuthStateSchema);