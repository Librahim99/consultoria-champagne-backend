const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();

const User = require('../models/User');
const { ranks } = require('../utils/enums');

// 🛡️ Registro de nuevo usuario
router.post('/register', async (req, res) => {
  try {
    const { username, password, rank } = req.body;

    if (!username || !password || !rank) {
      return res.status(400).json({ message: 'Faltan campos requeridos' });
    }

    if (!Object.values(ranks).includes(rank)) {
      return res.status(400).json({ message: 'Rango inválido' });
    }

    const userExistente = await User.findOne({ username });
    if (userExistente) {
      return res.status(409).json({ message: 'El usuario ya existe' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const nuevoUsuario = new User({ username, password: hashedPassword, rank });
    await nuevoUsuario.save();

    const token = jwt.sign(
      { id: nuevoUsuario._id, username: nuevoUsuario.username, rank: nuevoUsuario.rank },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.status(201).json({ token });
  } catch (err) {
    console.error('❌ Error en /register:', err);
    res.status(500).json({ message: 'Error interno al registrar usuario', error: err.message });
  }
});

// 🔐 Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Usuario y contraseña son requeridos' });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      { id: user._id, username: user.username, rank: user.rank },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({ token });
  } catch (err) {
    console.error('❌ Error en /login:', err);
    res.status(500).json({ message: 'Error interno al iniciar sesión', error: err.message });
  }
});

module.exports = router;
