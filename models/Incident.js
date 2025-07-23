const mongoose = require('mongoose');
const { incident_status, incident_types } = require('../utils/enums');

const incidentSchema = new mongoose.Schema({
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  executiveId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  assignedUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false, default: null },
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
  sequenceNumber: { type: Number, required: true }, // Campo requerido, generado en el backend
});

// Pre-save hook para manejar assignedUserId inválido
incidentSchema.pre('save', function(next) {
  if (this.assignedUserId === '' || this.assignedUserId == null) {
    this.assignedUserId = null;
  }
  next();
});

module.exports = mongoose.model('Incident', incidentSchema);