const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // Ej: 'assistance_sequence'
  seq: { type: Number, default: 0 }
});

module.exports = mongoose.models.Counter || mongoose.model('Counter', counterSchema);
