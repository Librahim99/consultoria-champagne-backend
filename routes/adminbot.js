// adminbot.js
const express = require('express');
const router = express.Router();
const fs = require('fs'); // Agregado: importa fs para rmSync
const User = require("../models/User");
const authMiddleware = require('../middleware/authMiddleware');
const { ranks } = require('../utils/enums');
const botModule = require('../bot'); // Require del objeto exportado
const Pending = require('../models/Pending');
const Incident = require('../models/Incident');
const Client = require('../models/Client');

// Accede a través de getters
const getBotStatus = botModule.getBotStatus;
const getCurrentQr = botModule.getCurrentQr;
const getSockGlobal = botModule.getSockGlobal;
const startConnection = botModule.startConnection;

// 🔒 Middleware para control de acceso total
const totalAccessMiddleware = (req, res, next) => {
  if (req.user.rank !== ranks.TOTALACCESS) {
    return res.status(403).json({ message: 'Acceso denegado. Se requiere rango TOTALACCESS.' });
  }
  next();
};

router.get('/status', (req, res) => res.json({ 
  status: getBotStatus(), 
  qr: getCurrentQr()
}));

router.post('/start-session', authMiddleware, totalAccessMiddleware, async (req, res) => {
  if (getBotStatus() !== 'disconnected') {
    return res.status(400).json({ message: 'El bot ya está conectado o en proceso.' });
  }
  try {
    await startConnection();
    res.json({ success: true, message: 'Iniciando sesión del bot...' });
  } catch (error) {
    console.error('Error al iniciar conexión:', error);
    res.status(500).json({ message: 'Error al iniciar la sesión del bot.' });
  }
});

router.post('/logout', authMiddleware, totalAccessMiddleware, async (req, res) => {
  const { password } = req.body;
  if (password !== process.env.LOGOUT_PASSWORD) {
    return res.status(401).json({ message: 'Contraseña incorrecta para cerrar sesión.' });
  }
  try {
    fs.rmSync('auth_info', { recursive: true, force: true });
  } catch (err) {
    console.error('Error al limpiar auth_info:', err);
  }
  // CAMBIO: Borra documentos de la sesión actual
  await require('../models/AuthState').deleteMany({ sessionId: process.env.SESSION_ID || 'default' });
  getSockGlobal()?.logout();
  res.json({ success: true, message: 'Sesión cerrada y datos borrados. Escanea QR para reiniciar.' });
});

router.post('/send-test', authMiddleware, totalAccessMiddleware, async (req, res) => {
  const { message } = req.body;
  const users = await User.find({ rank: ranks.TOTALACCESS, number: { $exists: true } });
  users.forEach(user => getSockGlobal()?.sendMessage(`549${user.number}@s.whatsapp.net`, { text: message }));
  res.json({ success: true });
});

router.post('/sendPending', async (req, res) => {
  const { pendingId, targetUserId } = req.body;
try {
  const pending = await Pending.findById(pendingId);
  if (!pending) return res.status(404).json({ message: 'Pendiente no encontrado' });
  const incidence = await Incident.findById(pending.incidentId)
  const targetUser = await User.findById(targetUserId);
  const client = await Client.findById(pending.clientId)

  if (!targetUser) return res.status(404).json({ message: 'Usuario no encontrado' });
  if (!targetUser.number) return res.status(400).json({ message: 'El usuario no tiene número de teléfono configurado' });

  const resumen = `📌 *Resumen de Tarea Pendiente*\nCliente: ${client.name}\nFecha: ${new Date(pending.date).toLocaleString()}\nEstado: ${pending.status}\nDetalle: ${pending.detail}\nObservación: ${pending.observation || 'N/A'}\nIncidencia N°: ${incidence?.sequenceNumber || 'N/A'}`;

  const jid = `549${targetUser.number}@s.whatsapp.net`;
  getSockGlobal()?.sendMessage(jid, { text: resumen });

  res.json({success:true, message: 'Resumen enviado exitosamente vía WhatsApp' });
} catch (err) {
  console.error('❌ Error enviando resumen:', err);
  res.status(500).json({ message: err.message.includes('Connection Closed') ? 'Bot desconectado, intenta de nuevo' : 'Error al enviar resumen' });
}
});

module.exports = router;