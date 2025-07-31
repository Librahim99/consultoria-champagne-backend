const mongoose = require('mongoose');

const authStateSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, index: true },
  key: { type: String, required: true },
  value: { type: String, required: true }
}, { timestamps: true });

// CAMBIO: Forzamos drop del índice legacy y creamos el compuesto
authStateSchema.pre('index', async function(next) {
  try {
    const indexes = await mongoose.connection.db
      .collection('authstates')
      .indexes();
    const hasLegacyIndex = indexes.some(idx => idx.key.key === 1 && idx.unique);
    if (hasLegacyIndex) {
      await mongoose.connection.db.collection('authstates').dropIndex('key_1');
      console.log('🧹 Índice legacy key_1 eliminado.');
    }
    next();
  } catch (err) {
    console.error('❌ Error al manejar índices:', err);
    next(err);
  }
});

// Índice único compuesto
authStateSchema.index({ sessionId: 1, key: 1 }, { unique: true });

module.exports = mongoose.model('AuthState', authStateSchema);