const mongoose = require('mongoose');

const AuthStateSchema = new mongoose.Schema({
  key: { type: String, unique: true },
  value: mongoose.Schema.Types.Mixed // For flexible JSON creds/keys
});

module.exports = mongoose.model('AuthState', AuthStateSchema);