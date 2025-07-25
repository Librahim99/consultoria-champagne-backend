const mongoose = require('mongoose');

// 📒 Modelo de asistencia
const assistanceSchema = new mongoose.Schema({
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  detail: {
    type: String,
    required: [true, 'El campo "detail" es obligatorio.'],
    trim: true
  },
  contact: {
    type: String,
    required: [true, 'El campo "contact" es obligatorio.'],
    trim: true
  },
  timeSpent: {
    type: Number,
    required: true,
    min: [0, 'El tiempo no puede ser negativo.']
  },
  incidentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Incident',
    default: null
  },
  pendingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pending',
    default: null
  },
  sequenceNumber: {
    type: Number,
    required: true,
    unique: true
  }
}, {
  timestamps: true
});

// Opcional: Hook para asegurar que sequenceNumber se asigne, pero lo manejaremos en el endpoint
module.exports = mongoose.model('Assistance', assistanceSchema);