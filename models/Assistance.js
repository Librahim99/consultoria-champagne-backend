const mongoose = require('mongoose');
const Counter = require('./Counter'); // ✅ Importación segura del modelo Counter

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

// 🔢 Generador de número de secuencia automático
assistanceSchema.pre('validate', async function (next) {
  if (this.isNew && !this.sequenceNumber) {
    try {
      const counter = await Counter.findByIdAndUpdate(
        { _id: 'assistance_sequence' },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      this.sequenceNumber = counter.seq;
    } catch (err) {
      console.error('❌ Error al generar sequenceNumber:', err);
      return next(err);
    }
  }
  next();
});

module.exports = mongoose.model('Assistance', assistanceSchema);
