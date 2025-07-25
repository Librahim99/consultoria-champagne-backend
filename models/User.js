const mongoose = require('mongoose');
const { ranks } = require('../utils/enums');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'El nombre de usuario es obligatorio.'],
    unique: true,
    trim: true,
    minlength: [3, 'El nombre de usuario debe tener al menos 3 caracteres.']
  },
  password: {
    type: String,
    required: [true, 'La contraseña es obligatoria.'],
    minlength: [6, 'La contraseña debe tener al menos 6 caracteres.']
  },
  rank: {
    type: String,
    required: [true, 'El rango es obligatorio.'],
    enum: {
      values: Object.values(ranks),
      message: 'Rango inválido: {VALUE}'
    }
  },
  number: {
    type: String
  },
  entryDate: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date,
    default: null
  },
  active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true // createdAt, updatedAt
});

module.exports = mongoose.model('User', userSchema);
