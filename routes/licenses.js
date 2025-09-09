const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { ranks } = require('../utils/enums');
const Client = require('../models/Client');
const { runLicenseReminders, sendForClient, todayKey, daysDiffLocal } = require('../bot/servicios/licenseReminderJob');

// Bloquea invitados solamente (conservar tu lógica actual)
const totalAccessMiddleware = (req, res, next) => {
  if (req.user.rank === ranks.GUEST) {
    return res.status(403).json({ message: 'Acceso denegado. Requiere Acceso Total' });
  }
  next();
};

// GET /api/licenses/run-reminders?dryRun=true&maxDays=14
router.get('/run-reminders', authMiddleware, totalAccessMiddleware, async (req, res) => {
  const dryRun = String(req.query.dryRun || 'false').toLowerCase() === 'true';

  const maxDays = req.query.maxDays
  if(!maxDays) {
    return res.status(400).json({ ok: false, message: 'maxDays inválido' })
  }

  try {
    const result = await runLicenseReminders({ dryRun, maxDays });
    return res.json({
      ok: true,
      dryRun,
      maxDays: typeof maxDays === 'number' ? maxDays : '(env/def)',
      sent: result
    });
  } catch (e) {
    console.error('❌ run-reminders error:', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
});

// GET /api/licenses/due?maxDays=15&
router.get('/due', authMiddleware, totalAccessMiddleware, async (req, res) => {
  try {
    const LICENSE_DURATION_DAYS = Number(process.env.LICENSE_DURATION_DAYS || 62);
    const maxDays = Number.isFinite(Number(req.query.maxDays)) ? Number(req.query.maxDays) : 15;

    const query = { active: true };
    const clients = await Client.find(query).select('name common lastUpdate active').lean();

    const MS = 86400000;
    const toUTC = (d) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
    const today = new Date();

    const rows = [];
    for (const c of clients) {
      if (!c.lastUpdate) continue;

      const venc = new Date(c.lastUpdate);
      venc.setDate(venc.getDate() + LICENSE_DURATION_DAYS);

      const diasRestantes = Math.floor((toUTC(venc) - toUTC(today)) / MS);
      if (diasRestantes < 0 || diasRestantes > maxDays) continue;

      rows.push({
        name: c.name,
        common: c.common,
        lastUpdate: new Date(c.lastUpdate).toISOString().slice(0, 10),
        vence: new Date(venc).toISOString().slice(0, 10),
        diasRestantes
      });
    }

    rows.sort((a, b) => a.diasRestantes - b.diasRestantes);
    res.json({ ok: true, maxDays, rows });
  } catch (e) {
    console.error('❌ /api/licenses/due error:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});


// POST /api/licenses/send-reminder/:clientId  -> click derecho en Clients
router.post('/send-reminder/:clientId', authMiddleware, totalAccessMiddleware, async (req, res) => {
  try {
    const c = await Client.findById(req.params.clientId).lean();
    if (!c) return res.status(404).json({ ok: false, message: 'Cliente no encontrado' });
    if (!c.lastUpdate) return res.status(400).json({ ok: false, message: 'Cliente sin lastUpdate' });

    const LICENSE_DURATION_DAYS = Number(process.env.LICENSE_DURATION_DAYS || 62);
    const venc = new Date(c.lastUpdate);
    venc.setDate(venc.getDate() + LICENSE_DURATION_DAYS);

    const MS = 86400000;
    const toUTC = (d) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
    const diasRestantes = Math.floor((toUTC(venc) - toUTC(new Date())) / MS);

    const result = await sendForClient(c, { dryRun: false, diasRestantes });
    return res.json({ ok: true, ...result });
  } catch (e) {
    console.error('❌ send-reminder error:', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
});

/** OPCIONAL: test rápido de envío al grupo */
router.post('/test-group', authMiddleware, totalAccessMiddleware, async (req, res) => {
  try {
    const botModule = require('../bot');
    const sock = botModule.getSockGlobal?.();
    const jid = process.env.LICENSES_GROUP_JID;
    if (!jid) return res.status(400).json({ ok: false, message: 'Falta LICENSES_GROUP_JID' });
    if (!sock) return res.status(503).json({ ok: false, message: 'Bot no conectado' });

    await sock.sendMessage(jid, { text: '🧪 Test al grupo de licencias' });
    return res.json({ ok: true });
  } catch (e) {
    console.error('❌ test-group error:', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;
