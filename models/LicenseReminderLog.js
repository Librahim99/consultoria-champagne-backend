const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', index: true },
  dateKey: { type: String, index: true }, // YYYY-MM-DD del envío (zona AR)
  daysBefore: { type: Number, default: 15 },
  groupJid: { type: String },
  runSlot: { type: String, enum: ['AM','PM'], default: 'AM', index: true }, // 👈 NUEVO
  createdAt: { type: Date, default: Date.now }
});

// 👇 ahora el único incluye runSlot para permitir 2 envíos por día
schema.index({ clientId: 1, dateKey: 1, daysBefore: 1, runSlot: 1 }, { unique: true });

module.exports = mongoose.model('LicenseReminderLog', schema);
