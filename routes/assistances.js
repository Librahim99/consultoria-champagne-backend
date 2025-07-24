const express = require('express');
const router = express.Router();
const Assistance = require('../models/Assistance');
const authMiddleware = require('../middleware/authMiddleware');
const { ranks } = require('../utils/enums');

// 🔒 Middleware para controlar acceso total
const totalAccessMiddleware = (req, res, next) => {
  if (req.user.rank !== ranks.TOTALACCESS) {
    return res.status(403).json({ message: 'Acceso denegado. Se requiere rango TOTALACCESS.' });
  }
  next();
};

// 📌 Crear nueva asistencia
router.post('/', authMiddleware, totalAccessMiddleware, async (req, res) => {
  try {
    const { clientId, userId, detail, contact, timeSpent, incidentId, pendingId, date } = req.body;

    if (!clientId || !userId || !detail || !contact || timeSpent == null) {
      return res.status(400).json({ message: 'Faltan campos requeridos: clientId, userId, detail, contact, timeSpent' });
    }

    const nuevaAsistencia = new Assistance({
      clientId,
      userId,
      detail,
      contact,
      timeSpent,
      incidentId,
      pendingId,
      date
    });

    await nuevaAsistencia.save();
    res.status(201).json(nuevaAsistencia);
  } catch (error) {
    console.error('❌ Error al crear asistencia:', error);
    res.status(500).json({ message: 'Error interno al crear la asistencia', error: error.message });
  }
});

// 📊 Obtener todas las asistencias
router.get('/', authMiddleware, async (req, res) => {
  try {
    const asistencias = await Assistance.find()
      .populate('clientId', 'name common')
      .populate('userId', 'username rank')
      .populate('incidentId', 'subject')
      .populate('pendingId', 'detail');

    res.json(asistencias);
  } catch (error) {
    console.error('❌ Error al obtener asistencias:', error);
    res.status(500).json({ message: 'Error al obtener asistencias', error: error.message });
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

module.exports = router;
