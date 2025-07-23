const express = require('express');
const router = express.Router();
const Pending = require('../models/Pending');
const authMiddleware = require('../middleware/authMiddleware');
const { ranks } = require('../utils/enums');

const totalAccessMiddleware = (req, res, next) => {
  if (req.user.rank !== ranks.TOTALACCESS) {
    return res.status(403).json({ message: 'Acceso denegado. Requiere Acceso Total' });
  }
  next();
};

router.post('/', authMiddleware, totalAccessMiddleware, async (req, res) => {
  const { clientId, date, status, detail, observation, incidentId, userId, assignedUserId, completionDate } = req.body;

  try {
    if (!clientId || !status || !detail || !userId) {
      return res.status(400).json({ message: 'Faltan campos requeridos: clientId, status, detail, userId' });
    }

    const lastPending = await Pending.findOne().sort({ sequenceNumber: -1 });
    const sequenceNumber = lastPending ? lastPending.sequenceNumber + 1 : 1;

    const pending = new Pending({
      clientId,
      date: date ? new Date(date) : new Date(),
      status,
      detail,
      observation,
      incidentId,
      userId,
      assignedUserId,
      completionDate: completionDate ? new Date(completionDate) : null,
      sequenceNumber,
    });
    await pending.save();
    res.status(201).json(pending);
  } catch (error) {
    console.error('Error al crear pendiente:', error);
    res.status(400).json({ message: 'Error al crear pendiente', error: error.message });
  }
});

router.get('/', authMiddleware, async (req, res) => {
  try {
    const pendings = await Pending.find();
    res.json(pendings);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener pendientes', error: error.message });
  }
});

router.put('/:id', authMiddleware, totalAccessMiddleware, async (req, res) => {
  const { clientId, date, status, detail, observation, incidentId, userId, assignedUserId, completionDate } = req.body;

  try {
    const pending = await Pending.findByIdAndUpdate(
      req.params.id,
      {
        clientId,
        date: date ? new Date(date) : undefined,
        status,
        detail,
        observation,
        incidentId,
        userId,
        assignedUserId,
        completionDate: completionDate ? new Date(completionDate) : undefined,
      },
      { new: true }
    );
    if (!pending) {
      return res.status(404).json({ message: 'Pendiente no encontrado' });
    }
    res.json(pending);
  } catch (error) {
    res.status(400).json({ message: 'Error al actualizar pendiente', error: error.message });
  }
});

router.delete('/:id', authMiddleware, totalAccessMiddleware, async (req, res) => {
  try {
    const pending = await Pending.findByIdAndDelete(req.params.id);
    if (!pending) {
      return res.status(404).json({ message: 'Pendiente no encontrado' });
    }
    res.json({ message: 'Pendiente eliminado' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar pendiente', error: error.message });
  }
});

module.exports = router;