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

console.log(getBotStatus(), getCurrentQr(), getSockGlobal()); // Para depuración

// 🔒 Middleware para control de acceso total
const totalAccessMiddleware = (req, res, next) => {
  if (req.user.rank !== ranks.TOTALACCESS) {
    return res.status(403).json({ message: 'Acceso denegado. Se requiere rango TOTALACCESS.' });
  }
  next();
};

router.get('/status', (req, res) => res.json({ status: getBotStatus(), qr: getCurrentQr() }));

router.post('/logout', authMiddleware, totalAccessMiddleware, (req, res) => {
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