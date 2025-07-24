const express = require('express');
const router = express.Router();
const Pending = require('../models/Pending');
const authMiddleware = require('../middleware/authMiddleware');
const { ranks } = require('../utils/enums');

// Middleware para validar Acceso Total
const totalAccessMiddleware = (req, res, next) => {
  if (req.user.rank !== ranks.TOTALACCESS) {
    return res.status(403).json({ message: 'Acceso denegado. Se requiere Acceso Total.' });
  }
  next();
};

// 📌 Crear pendiente
router.post('/', authMiddleware, totalAccessMiddleware, async (req, res) => {
  try {
    const {
      clientId, date, status, detail, observation,
      incidentId, userId, assignedUserId, completionDate
    } = req.body;

    if (!clientId || !status || !detail || !userId) {
      return res.status(400).json({ message: 'Faltan campos requeridos: clientId, status, detail, userId' });
    }

    const last = await Pending.findOne().sort({ sequenceNumber: -1 });
    const sequenceNumber = last ? last.sequenceNumber + 1 : 1;

    const pending = new Pending({
      clientId,
      userId,
      detail,
      status,
      sequenceNumber,
      date: date ? new Date(date) : new Date(),
      observation: observation || null,
      incidentId: incidentId || null,
      assignedUserId: assignedUserId || null,
      completionDate: completionDate ? new Date(completionDate) : null
    });

    await pending.save();
    res.status(201).json({ message: 'Pendiente creado correctamente', data: pending });
  } catch (error) {
    console.error('❌ Error al crear pendiente:', error);
    res.status(500).json({ message: 'Error interno al crear pendiente', error: error.message });
  }
});

// 📊 Obtener todos los pendientes con filtros
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { status, clientId, desde, hasta } = req.query;

    const filtro = {};

    if (status) filtro.status = status;
    if (clientId) filtro.clientId = clientId;

    if (desde || hasta) {
      filtro.date = {};
      if (desde) filtro.date.$gte = new Date(desde);
      if (hasta) filtro.date.$lte = new Date(hasta);
    }

    const pendings = await Pending.find(filtro)
      .populate('clientId userId assignedUserId incidentId')
      .sort({ date: -1 });

    res.json(pendings);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener pendientes', error: error.message });
  }
});

// ✏️ Actualizar pendiente
router.put('/:id', authMiddleware, totalAccessMiddleware, async (req, res) => {
  try {
    const {
      clientId, date, status, detail, observation,
      incidentId, userId, assignedUserId, completionDate
    } = req.body;

    const updateData = {
      clientId,
      status,
      detail,
      observation: observation || null,
      incidentId: incidentId || null,
      userId,
      assignedUserId: assignedUserId || null,
      date: date ? new Date(date) : undefined,
      completionDate: completionDate ? new Date(completionDate) : undefined
    };

    const updated = await Pending.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!updated) {
      return res.status(404).json({ message: 'Pendiente no encontrado' });
    }

    res.json({ message: 'Pendiente actualizado correctamente', data: updated });
  } catch (error) {
    res.status(400).json({ message: 'Error al actualizar pendiente', error: error.message });
  }
});

// 🗑️ Eliminar pendiente
router.delete('/:id', authMiddleware, totalAccessMiddleware, async (req, res) => {
  try {
    const deleted = await Pending.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Pendiente no encontrado' });
    }
    res.json({ message: 'Pendiente eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar pendiente', error: error.message });
  }
});

module.exports = router;
