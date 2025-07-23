const mongoose = require('mongoose');
const { incident_status } = require('../utils/enums');

const pendingSchema = new mongoose.Schema({
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  date: { type: Date, default: Date.now },
  status: { type: String, required: true, enum: Object.keys(incident_status) },
  detail: { type: String, required: true },
  observation: { type: String },
  incidentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Incident', default: null },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  assignedUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  completionDate: { type: Date },
  sequenceNumber: { type: Number, required: true }, // Campo requerido, generado en el backend
});

module.exports = mongoose.model('Pending', pendingSchema);