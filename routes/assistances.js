const express = require('express');
const router = express.Router();
const Assistance = require('../models/Assistance');
const authMiddleware = require('../middleware/authMiddleware');
const { ranks } = require('../utils/enums');
const moment = require('moment'); 

// 🔒 Middleware para controlar acceso total
const totalAccessMiddleware = (req, res, next) => {
  if (req.user.rank === ranks.GUEST) {
    return res.status(403).json({ message: 'Acceso denegado. Se requiere rango TOTALACCESS.' });
  }
  next();
};

// 📌 Crear nueva asistencia
router.post('/', authMiddleware, totalAccessMiddleware, async (req, res) => {
  const { clientId, userId, date, detail, contact, timeSpent, incidentId, pendingId } = req.body;

  try {
    if (!clientId || !userId || !detail || !contact || !timeSpent || !date) {
      return res.status(400).json({ message: 'Faltan campos requeridos' });
    }

    // Generar sequenceNumber automáticamente
    const lastAssistance = await Assistance.findOne().sort({ sequenceNumber: -1 });
    const sequenceNumber = lastAssistance ? lastAssistance.sequenceNumber + 1 : 1;

    const assistance = new Assistance({ clientId, userId, date, detail, contact, timeSpent, incidentId, pendingId, sequenceNumber });
    await assistance.save();
    res.status(201).json(assistance);
  } catch (error) {
    console.error('❌ Error al crear asistencia:', error);
    res.status(400).json({ message: 'Error interno al crear la asistencia', error: error.message });
  }
});

router.get('/', authMiddleware, async (req, res) => {
  try {
    const { userFilter = 'me', dateFilter = 'week', clientId } = req.query; // Sin status
    const filtro = {};

    if (userFilter === 'me' && req.user) {
      filtro.userId = req.user.id;
    }

    if (dateFilter !== 'all') {
      const now = moment();
      let startDate;
      if (dateFilter === 'week') {
        startDate = now.startOf('isoWeek');
      } else if (dateFilter === 'month') {
        startDate = now.startOf('month');
      }
      filtro.date = { $gte: startDate.toDate() };
    }

    if (clientId) filtro.clientId = clientId;

    const assistances = await Assistance.find(filtro).sort({ date: -1 });
    res.json(assistances);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener assistances', error: error.message });
  }
});

// 🛠️ Actualizar asistencia por ID
router.put('/:id', authMiddleware, totalAccessMiddleware, async (req, res) => {
  try {
    const asistenciaActualizada = await Assistance.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!asistenciaActualizada) {
      return res.status(404).json({ message: 'Asistencia no encontrada' });
    }

    res.json(asistenciaActualizada);
  } catch (error) {
    console.error('❌ Error al actualizar asistencia:', error);
    res.status(400).json({ message: 'Error al actualizar asistencia', error: error.message });
  }
});

// 🗑️ Eliminar asistencia por ID
router.delete('/:id', authMiddleware, totalAccessMiddleware, async (req, res) => {
  try {
    const asistenciaEliminada = await Assistance.findByIdAndDelete(req.params.id);

    if (!asistenciaEliminada) {
      return res.status(404).json({ message: 'Asistencia no encontrada' });
    }

    res.json({ message: '✅ Asistencia eliminada correctamente' });
  } catch (error) {
    console.error('❌ Error al eliminar asistencia:', error);
    res.status(500).json({ message: 'Error al eliminar asistencia', error: error.message });
  }
});

// 📊 Asistencias por usuario con filtros
router.get('/por-usuario', authMiddleware, async (req, res) => {
  try {
    const { desde, hasta, minimo = 0 } = req.query;

    const matchStage = {};

    // 🕒 Filtro por campo date (NO createdAt)
    if (desde || hasta) {
      matchStage.date = {};
      if (desde) matchStage.date.$gte = new Date(desde);
      if (hasta) {
        const hastaDate = new Date(hasta);
        hastaDate.setHours(23, 59, 59, 999);
        matchStage.date.$lte = hastaDate;
      }
    }

    const data = await Assistance.aggregate([
      { $match: matchStage },
      {
        $group: {
  _id: '$userId',
  total: { $sum: 1 },
  lastDate: { $max: '$date' }
}
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'usuario'
        }
      },
      { $unwind: '$usuario' },
      {
        $project: {
  total: 1,
  name: '$usuario.name',
  createdAt: '$usuario.createdAt',
  fecha: '$lastDate'
}
      },
      {
        $match: {
          total: { $gte: Number(minimo) }
        }
      }
    ]);

    const resultado = data.map(d => ({
      name: d.name,
      total: d.total,
      fecha: d.fecha
    }));

    res.json(resultado);
  } catch (error) {
    console.error('❌ Error al obtener asistencias por usuario:', error);
    res.status(500).json({ message: 'Error interno', error });
  }
});




module.exports = router;