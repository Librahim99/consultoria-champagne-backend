const mongoose = require('mongoose');

const authStateSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, index: true },
  key: { type: String, required: true },
  value: { type: String, required: true }
}, { timestamps: true });

// Índice único compuesto
authStateSchema.index({ sessionId: 1, key: 1 }, { unique: true });

module.exports = mongoose.model('AuthState', authStateSchema);