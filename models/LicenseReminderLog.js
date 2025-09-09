const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', index: true },
  dateKey: { type: String, index: true }, // YYYY-MM-DD del envío
  daysBefore: { type: Number, default: 15 },
  groupJid: { type: String },
  createdAt: { type: Date, default: Date.now }
});

schema.index({ clientId: 1, dateKey: 1, daysBefore: 1 }, { unique: true });

module.exports = mongoose.model('LicenseReminderLog', schema);
