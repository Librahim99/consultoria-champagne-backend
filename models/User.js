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
    required: function () {
      return this.method !== 'google';
    },
    minlength: [6, 'La contraseña debe tener al menos 6 caracteres.']
  },
  rank: {
    type: String,
    required: function () {
      return this.method !== 'google';
    },
    enum: {
      values: Object.values(ranks),
      message: 'Rango inválido: {VALUE}'
    }
  },
  number: String,
  entryDate: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date,
    default: null
  },
  backgroundUrl: { // Nuevo: URL de fondo personalizado
    type: String,
    default: null // Opcional, null si no set
  },
  active: {
    type: Boolean,
    default: true
  },

  // 🔽 Campos para login con Google
  email: {
    type: String,
    unique: true,
    sparse: true, // Permite múltiples nulls
    trim: true
  },
  googleId: String,
  name: String,
  picture: String,
  method: {
    type: String,
    enum: ['local', 'google'],
    default: 'local'
  }

}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);
