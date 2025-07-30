const mongoose = require('mongoose');

const authStateSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, index: true },
  key: { type: String, required: true },
  value: { type: String, required: true }
}, { timestamps: true });

// CAMBIO: Droppea índice único viejo en key si existe, y crea compuesto
authStateSchema.indexes().forEach((idx) => {
  if (idx.key && idx.key.key === 1 && idx.unique) {
    authStateSchema.dropIndex('key_1');
  }
});

// Índice único compuesto
authStateSchema.index({ sessionId: 1, key: 1 }, { unique: true });

module.exports = mongoose.model('AuthState', authStateSchema);