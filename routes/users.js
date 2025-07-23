const express = require('express');
const router = express.Router();
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');
const { ranks } = require('../utils/enums');

// Middleware para verificar rango Acceso Total
const totalAccessMiddleware = (req, res, next) => {
  if (req.user.rank !== ranks.TOTALACCESS) {
    return res.status(403).json({ message: 'Acceso denegado. Requiere Acceso Total' });
  }
  next();
};

// Obtener todos los usuarios
router.get('/', authMiddleware, totalAccessMiddleware, async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener usuarios', error: error.message });
  }
});

// Actualizar usuario
router.put('/:id', authMiddleware, totalAccessMiddleware, async (req, res) => {
  const { username, password, rank } = req.body;
  try {
    if (rank && !Object.values(ranks).includes(rank)) {
      return res.status(400).json({ message: 'Rango inválido' });
    }
    const updateData = { username, rank };
    if (password) {
      const bcrypt = require('bcryptjs');
      updateData.password = await bcrypt.hash(password, 10);
    }
    const user = await User.findByIdAndUpdate(req.params.id, updateData, { new: true }).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    res.json(user);
  } catch (error) {
    res.status(400).json({ message: 'Error al actualizar usuario', error: error.message });
  }
});

module.exports = router;