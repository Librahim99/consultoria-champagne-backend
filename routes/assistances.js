const express = require('express');
const router = express.Router();
const Assistance = require('../models/Assistance');
const authMiddleware = require('../middleware/authMiddleware');
const { ranks } = require('../utils/enums');

const totalAccessMiddleware = (req, res, next) => {
  if (req.user.rank !== ranks.TOTALACCESS) {
    return res.status(403).json({ message: 'Acceso denegado. Requiere Acceso Total' });
  }
  next();
};

router.post('/', authMiddleware, totalAccessMiddleware, async (req, res) => {
  const { clientId, userId, date, detail, contact, timeSpent, incidentId, pendingId } = req.body;

  try {
    if (!clientId || !userId || !detail || !contact || !timeSpent) {
      return res.status(400).json({ message: 'Faltan campos requeridos: clientId, userId, detail, contact, timeSpent' });
    }

    // Generar sequenceNumber automáticamente
    const lastAssistance = await Assistance.findOne().sort({ sequenceNumber: -1 });
    const sequenceNumber = lastAssistance ? lastAssistance.sequenceNumber + 1 : 1;

    const assistance = new Assistance({ clientId, userId, date, detail, contact, timeSpent, incidentId, pendingId, sequenceNumber });
    await assistance.save();
    res.status(201).json(assistance);
  } catch (error) {
    console.error('Error al crear asistencia:', error);
    res.status(400).json({ message: 'Error al crear asistencia', error: error.message });
  }
});

router.get('/', authMiddleware, async (req, res) => {
  try {
    const assistances = await Assistance.find();
    res.json(assistances);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener asistencias', error: error.message });
  }
});

router.put('/:id', authMiddleware, totalAccessMiddleware, async (req, res) => {
  const { clientId, userId, date, detail, contact, timeSpent, incidentId, pendingId } = req.body;

  try {
    const assistance = await Assistance.findByIdAndUpdate(
      req.params.id,
      { clientId, userId, date, detail, contact, timeSpent, incidentId, pendingId },
      { new: true }
    );
    if (!assistance) {
      return res.status(404).json({ message: 'Asistencia no encontrada' });
    }
    res.json(assistance);
  } catch (error) {
    res.status(400).json({ message: 'Error al actualizar asistencia', error: error.message });
  }
});

router.delete('/:id', authMiddleware, totalAccessMiddleware, async (req, res) => {
  try {
    const assistance = await Assistance.findByIdAndDelete(req.params.id);
    if (!assistance) {
      return res.status(404).json({ message: 'Asistencia no encontrada' });
    }
    res.json({ message: 'Asistencia eliminada' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar asistencia', error: error.message });
  }
});

module.exports = router;