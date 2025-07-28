// adminbot.js
const express = require('express');
const router = express.Router();
const fs = require('fs'); // Agregado: importa fs para rmSync
const User = require("../models/User");
const authMiddleware = require('../middleware/authMiddleware');
const { ranks } = require('../utils/enums');
const botModule = require('../bot'); // Require del objeto exportado

// Accede a través de getters
const getBotStatus = botModule.getBotStatus;
const getCurrentQr = botModule.getCurrentQr;
const getSockGlobal = botModule.getSockGlobal;
const startConnection = botModule.startConnection; // Nuevo getter para iniciar conexión

console.log(getBotStatus(), getCurrentQr(), getSockGlobal()); // Para depuración

// 🔒 Middleware para control de acceso total
const totalAccessMiddleware = (req, res, next) => {
  if (req.user.rank !== ranks.TOTALACCESS) {
    return res.status(403).json({ message: 'Acceso denegado. Se requiere rango TOTALACCESS.' });
  }
  next();
};

router.get('/status', (req, res) => res.json({ status: getBotStatus(), qr: getCurrentQr() }));

router.post('/start-session', authMiddleware, totalAccessMiddleware, async (req, res) => {
  if (getBotStatus() !== 'disconnected') {
    return res.status(400).json({ message: 'El bot ya está conectado o en proceso.' });
  }
  try {
    await startConnection(); // Await para manejar la promesa async
    res.json({ success: true, message: 'Iniciando sesión del bot...' });
  } catch (error) {
    console.error('Error al iniciar conexión:', error);
    res.status(500).json({ message: 'Error al iniciar la sesión del bot.' });
  }
});

router.post('/logout', authMiddleware, totalAccessMiddleware, (req, res) => {
  const { password } = req.body;
  if (password !== process.env.LOGOUT_PASSWORD) {
    return res.status(401).json({ message: 'Contraseña incorrecta para cerrar sesión.' });
  }
  try {
    fs.rmSync('auth_info', { recursive: true, force: true }); // Agregado try-catch para robustez
  } catch (err) {
    console.error('Error al limpiar auth_info:', err);
  }
  getSockGlobal()?.logout();
  res.json({ success: true });
});

router.post('/send-test', authMiddleware, totalAccessMiddleware, async (req, res) => {
  const { message } = req.body;
  const users = await User.find({ rank: ranks.TOTALACCESS, number: { $exists: true } });
  users.forEach(user => getSockGlobal()?.sendMessage(`549${user.number}@s.whatsapp.net`, { text: message }));
  res.json({ success: true });
});

module.exports = router;