const express = require('express');
const router = express.Router();
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');
const { ranks, incident_status } = require('../utils/enums');
const Incident = require('../models/Incident');

// Middleware para verificar rango Acceso Total
const totalAccessMiddleware = (req, res, next) => {
  if (req.user.rank === ranks.GUEST) {
    return res.status(403).json({ message: 'Acceso denegado. Requiere Acceso Total' });
  }
  next();
};

// 📥 Obtener todos los usuarios (con filtro opcional por username)
router.get('/', authMiddleware, totalAccessMiddleware, async (req, res) => {
  try {
    const { username } = req.query;
    const filtro = {};

    if (username) {
      filtro.username = { $regex: new RegExp(username, 'i') };
    }

    const users = await User.find(filtro).select('-password').sort({ entryDate: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener usuarios', error: error.message });
  }
});

// 🔄 Actualizar usuario
router.put('/:id', authMiddleware, totalAccessMiddleware, async (req, res) => {
  try {
    const { username, password, rank } = req.body;

    if (rank && !Object.values(ranks).includes(rank)) {
      return res.status(400).json({ message: 'Rango inválido' });
    }

    const updateData = {};
    if (username) updateData.username = username;
    if (rank) updateData.rank = rank;
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const user = await User.findByIdAndUpdate(req.params.id, updateData, { new: true }).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    res.json({ message: 'Usuario actualizado correctamente', data: user });
  } catch (error) {
    res.status(400).json({ message: 'Error al actualizar usuario', error: error.message });
  }
});

// 📊 Obtener métricas de incidentes por usuario
router.get('/:id/metrics', authMiddleware, totalAccessMiddleware, async (req, res) => {
  try {
    const userId = req.params.id;
    const incidents = await Incident.find({ assignedUserId: userId });
    const cerrados = incidents.filter(i => i.status === incident_status.SOLVED);
    const abiertos = incidents.filter(i => i.status !== incident_status.SOLVED);
    const totalTiempo = cerrados.reduce((sum, i) => sum + (i.actualTime || 0), 0);
    const promedioResolucion = cerrados.length > 0 ? totalTiempo / cerrados.length : 0;

    const ultimoCierre = cerrados
      .filter(i => i.completionDate)
      .sort((a, b) => new Date(b.completionDate) - new Date(a.completionDate))[0]?.completionDate || null;

    res.json({
      asignados: incidents.length,
      abiertos: abiertos.length,
      cerrados: cerrados.length,
      promedioResolucion,
      ultimoCierre
    });


  } catch (error) {
    res.status(500).json({ message: 'Error al obtener métricas', error: error.message });
  }
});


module.exports = router;