const mongoose = require('mongoose');
const { incident_status, incident_types } = require('../utils/enums');
const Counter = require('./Counter'); // Reutilizable, ya corregido

const incidentSchema = new mongoose.Schema({
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  executiveId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  assignedUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  type: { type: String, required: true, enum: Object.values(incident_types) },
  subject: { type: String, required: true },
  detail: { type: String, required: true },
  observation: { type: String },
  attachments: [{ type: String }],
  order: { type: Number, required: true },
  estimatedTime: { type: Number },
  actualTime: { type: Number },
  status: { type: String, required: true, enum: Object.values(incident_status) },
  creationDate: { type: Date },
  completionDate: { type: Date },
  sequenceNumber: { type: Number, required: true }
}, {
  timestamps: true
});

// 🧠 Hook para generar sequenceNumber y normalizar assignedUserId
incidentSchema.pre('validate', async function (next) {
  if (this.isNew && !this.sequenceNumber) {
    try {
      const counter = await Counter.findByIdAndUpdate(
        { _id: 'incident_sequence' }, // Reutilizable como en Assistance
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      this.sequenceNumber = counter.seq;
    } catch (err) {
      console.error('❌ Error generando sequenceNumber para incident:', err);
      return next(err);
    }
  }

  if (!this.assignedUserId || this.assignedUserId === '') {
    this.assignedUserId = null;
  }

  next();
});

module.exports = mongoose.model('Incident', incidentSchema);
