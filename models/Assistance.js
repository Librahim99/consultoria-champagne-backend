const mongoose = require('mongoose');

const assistanceSchema = new mongoose.Schema({
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, default: Date.now },
  detail: { type: String, required: true },
  contact: { type: String, required: true },
  timeSpent: { type: Number, required: true },
  incidentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Incident', default: null },
  pendingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Pending', default: null },
  sequenceNumber: { type: Number, required: true, unique: true }, // Campo requerido, generado en el backend
});

// Opcional: Hook para asegurar que sequenceNumber se asigne, pero lo manejaremos en el endpoint
module.exports = mongoose.model('Assistance', assistanceSchema);