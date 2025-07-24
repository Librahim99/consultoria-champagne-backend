const mongoose = require('mongoose');
const Counter = require('./Counter'); // ⚠️ Ajustá el path si estás en otro lado
const { incident_status } = require('../utils/enums');

const pendingSchema = new mongoose.Schema({
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: [true, 'El ID del cliente es obligatorio.']
  },
  date: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    required: [true, 'El estado es obligatorio.'],
    enum: {
      values: Object.keys(incident_status),
      message: 'Estado inválido: {VALUE}.'
    }
  },
  detail: {
    type: String,
    required: [true, 'El detalle es obligatorio.'],
    trim: true
  },
  observation: {
    type: String,
    default: ''
  },
  incidentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Incident',
    default: null
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'El ID del usuario es obligatorio.']
  },
  assignedUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  completionDate: {
    type: Date,
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

// 🎯 Asignación automática de sequenceNumber
pendingSchema.pre('save', async function (next) {
  if (this.isNew) {
    try {
      const counter = await Counter.findOneAndUpdate(
        { _id: 'pending_sequence' },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );

      this.sequenceNumber = counter.seq;
    } catch (err) {
      console.error('❌ Error generando sequenceNumber para Pending:', err);
      return next(err);
    }
  }
  next();
});

module.exports = mongoose.model('Pending', pendingSchema);
