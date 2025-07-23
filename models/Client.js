const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  common: {
    type: String,
    required: true,
    match: /^[0-9]{4}$/, // Validar que sea un número de 4 dígitos
  },
  lastUpdate: { type: Date, required: false },
  vip: { type: Boolean, default: false },
  active: { type: Boolean, default: true },
});

module.exports = mongoose.model('Client', clientSchema);