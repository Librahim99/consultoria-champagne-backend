const express = require('express');
const router = express.Router();
const moment = require('moment-timezone');
const Client = require('../models/Client');
const authMiddleware = require('../middleware/authMiddleware');
const { ranks } = require('../utils/enums');

// 👇 Acceso al socket del bot (usa tu export existente)
const botModule = require('../bot'); // si tu export real está en '../bot/index', cambiá aquí
const Pending = require('../models/Pending');
const getSockGlobal = botModule?.getSockGlobal;

// Middleware para verificar rango Acceso Total
const totalAccessMiddleware = (req, res, next) => {
  if (req.user.rank === ranks.GUEST) {
    return res.status(403).json({ message: 'Acceso denegado. Requiere Acceso Total' });
  }
  next();
};

// Crear cliente
router.post('/', authMiddleware, totalAccessMiddleware, async (req, res) => {
  const { common, vip, active } = req.body;
  let { name } = req.body;
  try {
    name = name.toUpperCase()
    const client = new Client({ name, common, vip, active });
    await client.save();
    res.status(201).json(client);
  } catch (error) {
    res.status(400).json({ message: 'Error al crear cliente', error: error.message });
  }
});

// Obtener todos los clientes
router.get('/', authMiddleware, async (req, res) => {
  try {
    const clients = await Client.find();
    res.json(clients);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener clientes', error: error.message });
  }
});

// 🔍 Buscar clientes por nombre o código común
router.get('/buscar/:query', authMiddleware, async (req, res) => {
  const { query } = req.params;
  const limit = Math.min(parseInt(req.query.limit || '8', 10), 25); // ?limit=8
  const regex = new RegExp(query, 'i');
  try {
    const results = await Client.find({ $or: [{ name: regex }, { common: regex }] })
      .select('_id name common')       // solo lo que necesitás
      .limit(limit);
    res.json(results);
  } catch (error) {
    res.status(500).json({ message: 'Error en la búsqueda', error: error.message });
  }
});

// 📊 Estadísticas de clientes
router.get('/resumen', authMiddleware, async (req, res) => {
  try {
    const total = await Client.countDocuments();
    const activos = await Client.countDocuments({ active: true });
    const vip = await Client.countDocuments({ vip: true });
    res.json({ total, activos, vip });
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener resumen', error: error.message });
  }
});

// 📤 Exportar clientes a Excel
router.get('/exportar', authMiddleware, totalAccessMiddleware, async (req, res) => {
  try {
    const clients = await Client.find().lean();
    const data = clients.map(c => ({
      Nombre: c.name,
      Código: c.common,
      VIP: c.vip ? 'Sí' : 'No',
      Activo: c.active ? 'Sí' : 'No',
      ÚltimaActualización: c.lastUpdate ? new Date(c.lastUpdate).toLocaleDateString() : 'N/A'
    }));

    // Nota: asegurate de tener XLSX requerido/instalado si usás esta ruta
    const XLSX = require('xlsx');
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Clientes');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename=clientes.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ message: 'Error al exportar clientes', error: error.message });
  }
});

// Actualizar cliente
router.put('/:id', authMiddleware, totalAccessMiddleware, async (req, res) => {
  const { name, common, vip, active } = req.body;
  try {
    const client = await Client.findByIdAndUpdate(
      req.params.id,
      { name, common, vip, active },
      { new: true }
    );
    if (!client) return res.status(404).json({ message: 'Cliente no encontrado' });
    res.json(client);
  } catch (error) {
    res.status(400).json({ message: 'Error al actualizar cliente', error: error.message });
  }
});

// Eliminar cliente
router.delete('/:id', authMiddleware, totalAccessMiddleware, async (req, res) => {
  try {
    const client = await Client.findByIdAndDelete(req.params.id);
    if (!client) return res.status(404).json({ message: 'Cliente no encontrado' });
    res.json({ message: 'Cliente eliminado' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar cliente', error: error.message });
  }
});

router.post('/importar', async (req, res) => {
  const { clients } = req.body;
  try {
    clients.forEach(async element => {
      let newClient = {
        name: element.name.toUpperCase(),
        common: element.common,
        vip: false,
        active: true,
        lastUpdate: element.lastUpdate
      }
      const client = new Client(newClient);
      try {
        await client.save();
        console.log('cliente creado: ', client.name)
      } catch(error) {
        console.log('Error al crear cliente', client.name, client.common, error.message)
      }
    });
    res.status(201).json("Clientes creados");
  } catch (error) {
    res.status(400).json({ message: 'Error al crear clientes', error: error.message });
  }
});

/**
 * PATCH /api/clients/:id/update-license
 * Body: { lastUpdate: 'YYYY-MM-DD' }
 * Query: ?source=hoy|ayer|custom  (opcional, default custom)
 * - Actualiza la licencia y envía al grupo un mensaje con próximo vencimiento.
 */
router.patch('/:id/update-license', authMiddleware, totalAccessMiddleware, async (req, res) => {
  const { lastUpdate } = req.body; // 'YYYY-MM-DD'
  const source = String(req.query.source || 'custom').toLowerCase(); // hoy | ayer | custom
  if (!lastUpdate) return res.status(400).json({ message: 'Fecha de actualización requerida' });

  try {
    if (!moment(lastUpdate, 'YYYY-MM-DD', true).isValid()) {
      console.error('Fecha inválida recibida:', lastUpdate);
      throw new Error('Fecha inválida');
    }

    // Guardar como medianoche local AR y persistir
    const localMidnight = moment.tz(lastUpdate, 'YYYY-MM-DD', 'America/Argentina/Buenos_Aires').startOf('day');
    const date = localMidnight.toDate();

    const client = await Client.findByIdAndUpdate(
      req.params.id,
      { lastUpdate: date },
      { new: true }
    );
    if (!client) return res.status(404).json({ message: 'Cliente no encontrado' });

    // ---- Notificar al grupo con próximo vencimiento ----
    try {
      const LICENSE_DURATION_DAYS = Number(process.env.LICENSE_DURATION_DAYS || 62);
      const GROUP_JID = process.env.LICENSES_GROUP_JID;

      const vencLocal = localMidnight.clone().add(LICENSE_DURATION_DAYS, 'days');
      const fechaVencStr = vencLocal.format('DD/MM/YYYY');
      
      const actor = ( req.user?.name || 'Sistema');
      const sourceMap = { hoy: 'Hoy', ayer: 'Ayer', custom: 'Fecha' };
      const accion = sourceMap[source] || 'Fecha';
      // Mensaje moderno con emojis
      const text =
        `🟢 *Licencia actualizada*\n` +
        `🏷️ *Cliente:* ${client.name}${client.common ? ` (${client.common})` : ''}\n` +
        `🗓️ *Acción:* ${accion}\n` +
        `👤 *Por:* ${actor}\n` +
        `📆 *Próximo vencimiento:* ${fechaVencStr}\n\n` +
        `ℹ️ Ciclo: ${LICENSE_DURATION_DAYS} días.`;

      const sock = typeof getSockGlobal === 'function' ? getSockGlobal() : null;
      if (sock && GROUP_JID) {
        await sock.sendMessage(GROUP_JID, { text });
      } else {
        console.warn('⚠️ No hay socket o GROUP_JID para notificar actualización de licencia.');
      }
    } catch (sendErr) {
      console.error('⚠️ No se pudo enviar mensaje al grupo:', sendErr?.message || sendErr);
      // No rompemos la respuesta al cliente si falla el bot
    }

    // Responder con el cliente actualizado
    res.json(client);
  } catch (error) {
    console.error('Error al actualizar fecha:', error.message, 'Input:', lastUpdate);
    res.status(400).json({ message: 'Error al actualizar fecha de licencia', error: error.message });
  }
});

router.patch('/:id/update-access', authMiddleware, totalAccessMiddleware, async (req, res) => {
  const { access } = req.body;
  try {
    // Validar que access sea un array y que cada elemento cumpla con AccessInterface
    if (!Array.isArray(access)) {
      return res.status(400).json({ message: 'El campo access debe ser un array' });
    }
    for (const acc of access) {
      if (!acc.name || typeof acc.name !== 'string' ||
          !acc.ID || typeof acc.ID !== 'string' ||
          !acc.password || typeof acc.password !== 'string') {
        return res.status(400).json({ message: 'Cada acceso debe tener name, ID y password como strings' });
      }
    }
    const client = await Client.findByIdAndUpdate(
      req.params.id,
      { access },
      { new: true }
    );
    if (!client) return res.status(404).json({ message: 'Cliente no encontrado' });
    res.json(client);
  } catch (error) {
    console.error('Error al actualizar accesos:', error.message);
    res.status(400).json({ message: 'Error al actualizar accesos', error: error.message });
  }
});

router.get('/minimal', authMiddleware, async (req, res) => {
  try {
    const clients = await Client.find({ active: true }).select('_id name common').sort({ name: 1 });
    res.json(clients);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener clients mínimos', error: error.message });
  }
});

router.get('/:id/getSchedule', authMiddleware, async (req, res) => {
try {
  const client = await Client.findById(req.params.id)
  if(client.id) {
    let schedule = await Pending.find({clientId: client.id}).select('_id title estimatedDate status statusDetail')
    if (schedule.length){
      schedule = schedule.filter((p) => p.title != '')
      res.json(schedule)
    }
  }
} catch (error) {
    res.status(500).json({ message: 'Error al obtener agenda de cliente', error: error.message });
  }
})


module.exports = router;