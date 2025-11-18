// adminbot.js
const express = require('express');
const router = express.Router();
const fs = require('fs'); // Agregado: importa fs para rmSync
const User = require("../models/User");
const authMiddleware = require('../middleware/authMiddleware');
const { ranks, pending_status } = require('../utils/enums');
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
    await require('../models/AuthState').deleteMany({ sessionId: process.env.SESSION_ID || 'default' });
  getSockGlobal()?.logout();
    await startConnection();
    res.json({ success: true, message: 'Iniciando sesión del bot...' });
  } catch (error) {
    console.error('Error al iniciar conexión:', error);
    res.status(500).json({ message: 'Error al iniciar la sesión del bot.' });
  }
});

router.post('/logout', async (req, res) => {
  try {
    if (global.sock && global.sock.state === 'open') {
      await global.sock.logout();
      console.log('✅ Logout exitoso desde WhatsApp');
    } else if (global.sock) {
      global.sock.end(undefined);
      console.log('🔌 Socket cerrado limpiamente');
    }

    // Borramos sesión local
    global.clearSession();

    res.json({ success: true, message: 'Bot desconectado y sesión eliminada' });
  } catch (error) {
    console.error('Error en logout:', error.message);
    res.status(500).json({ success: false, message: 'Error al desconectar' });
  }
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
    const incidence = await Incident.findById(pending.incidentId);
    const targetUser = await User.findById(targetUserId);
    const client = await Client.findById(pending.clientId);

    if (!targetUser) return res.status(404).json({ message: 'Usuario no encontrado' });
    if (!targetUser.number) return res.status(400).json({ message: 'El usuario no tiene número de teléfono configurado' });

    // Mapear el estado al valor legible usando pending_status
    const statusText = pending_status[pending.status] || pending.status;

    const resumen =`📌 *Resumen de Tarea Pendiente n° ${pending.sequenceNumber}*\n~~~~~~~~~~~~~~~~~~~~~~\n- ${client.name}\n- ${new Date(pending.date).toLocaleString()}\n- ${statusText}\n- ${pending.detail}\n${pending.observation ? `- ${pending.observation}`: ''}\n${pending.incidentNumber ? `- Jira #${pending.incidentNumber}`: ''}`

    const jid = `549${targetUser.number}@s.whatsapp.net`;
    getSockGlobal()?.sendMessage(jid, { text: resumen });

    res.json({ success: true, message: 'Resumen enviado exitosamente vía WhatsApp' });
  } catch (err) {
    console.error('❌ Error enviando resumen:', err);
    res.status(500).json({ message: err.message.includes('Connection Closed') ? 'Bot desconectado, intenta de nuevo' : 'Error al enviar resumen' });
  }
});

router.post('/sendMessage', async(req, res) => {
const {number, message} = req.body
if (number && message) {
  try {
  const jid = `549${number}@s.whatsapp.net`;
  getSockGlobal()?.sendMessage(jid, { text: message });
  res.json({success:true, message: 'Mensaje enviado exitosamente vía WhatsApp' });
  } catch(err) {
  res.status(500).json('Error enviando mensaje')
  }
} else {
res.status(400).json('No existe numero o mensaje')
}
})

module.exports = router;