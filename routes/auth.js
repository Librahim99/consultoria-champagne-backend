const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const router = express.Router();

const User = require('../models/User');
const { ranks } = require('../utils/enums');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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

    const token = generarToken(nuevoUsuario);

    res.status(201).json({ token });
  } catch (err) {
    console.error('❌ Error en /register:', err);
    res.status(500).json({ message: 'Error interno al registrar usuario', error: err.message });
  }
});

// 🔐 Login con usuario y contraseña
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

    // ✅ Actualizar último acceso
    user.lastLogin = new Date();
    await user.save();

    const token = generarToken(user);

    res.json({ token });
  } catch (err) {
    console.error('❌ Error en /login:', err);
    res.status(500).json({ message: 'Error interno al iniciar sesión', error: err.message });
  }
});

// 🔐 Login con Google Auth Code
router.post('/google', async (req, res) => {
  try {
    const { email, name, picture, googleId } = req.body;

    if (!email || !googleId) {
      return res.status(400).json({ message: 'Faltan datos de Google' });
    }

    let user = await User.findOne({ email });

    if (!user) {
      user = new User({
        username: email,
        email,
        name,
        picture,
        googleId,
        method: 'google',
        password: '[google]',  // dummy password para pasar validación
        rank: ranks.CONSULTOR  // default
      });
    } else {
      user.name = name;
      user.picture = picture;
      user.googleId = googleId;
    }

    // ✅ Actualizar último acceso
    user.lastLogin = new Date();
    await user.save();

    const jwtToken = generarToken(user);
    res.json({ token: jwtToken });

  } catch (err) {
    console.error('❌ Error en /google:', err);
    res.status(500).json({ message: 'Error al autenticar con Google', error: err.message });
  }
});

// 🎫 Helper para generar JWT
function generarToken(user) {
  return jwt.sign(
    {
      id: user._id,
      username: user.username,
      rank: user.rank,
    },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );
}

module.exports = router;
