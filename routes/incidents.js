const express = require('express');
const router = express.Router();
const Incident = require('../models/Incident');
const authMiddleware = require('../middleware/authMiddleware');
const { ranks } = require('../utils/enums');

// Middleware para verificar rango Acceso Total
const totalAccessMiddleware = (req, res, next) => {
  if (req.user.rank !== ranks.TOTALACCESS) {
    return res.status(403).json({ message: 'Acceso denegado. Requiere Acceso Total' });
  }
  next();
};

// Crear incidente
router.post('/', authMiddleware, totalAccessMiddleware, async (req, res) => {
  const {
    clientId, userId, executiveId, assignedUserId, contactNumber,
    type, subject, detail, observation, attachments, order,
    estimatedTime, actualTime, status, creationDate, completionDate
  } = req.body;

  try {
    if (!clientId || !userId || !executiveId || !type || !subject || !detail || !order || !status) {
      return res.status(400).json({ message: 'Faltan campos requeridos' });
    }

    const lastIncident = await Incident.findOne().sort({ sequenceNumber: -1 });
    const sequenceNumber = lastIncident ? lastIncident.sequenceNumber + 1 : 1;

    const incident = new Incident({
      clientId,
      userId,
      executiveId,
      assignedUserId,
      contactNumber,
      type,
      subject,
      detail,
      observation,
      attachments,
      order,
      estimatedTime,
      actualTime,
      status,
      creationDate: creationDate || Date.now(),
      completionDate,
      sequenceNumber
    });
    await incident.save();
    res.status(201).json(incident);
  } catch (error) {
    res.status(400).json({ message: 'Error al crear incidente', error: error.message });
  }
});

// Obtener todos los incidentes
router.get('/', authMiddleware, async (req, res) => {
  try {
    const incidents = await Incident.find();
    res.json(incidents);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener incidentes', error: error.message });
  }
});

// 🔍 Buscar por estado, tipo, usuario asignado o fecha
router.get('/buscar', authMiddleware, async (req, res) => {
  try {
    const { status, type, assignedUserId, startDate, endDate, clientId } = req.query;

    const filtro = {};
    if (status) filtro.status = status;
    if (type) filtro.type = type;
    if (assignedUserId) filtro.assignedUserId = assignedUserId;
    if (clientId) filtro.clientId = clientId;
    if (startDate || endDate) {
      filtro.creationDate = {};
      if (startDate) filtro.creationDate.$gte = new Date(startDate);
      if (endDate) filtro.creationDate.$lte = new Date(endDate);
    }

    const incidents = await Incident.find(filtro).sort({ creationDate: -1 });
    res.json(incidents);
  } catch (error) {
    res.status(500).json({ message: 'Error en búsqueda de incidentes', error: error.message });
  }
});

// 📊 Resumen estadístico
router.get('/resumen', authMiddleware, async (req, res) => {
  try {
    const total = await Incident.countDocuments();
    const abiertos = await Incident.countDocuments({ status: 'abierto' });
    const cerrados = await Incident.countDocuments({ status: 'cerrado' });

    res.json({ total, abiertos, cerrados });
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener resumen', error: error.message });
  }
});

// 📤 Exportar incidentes a Excel
router.get('/exportar', authMiddleware, totalAccessMiddleware, async (req, res) => {
  try {
    const incidents = await Incident.find().lean();
    const data = incidents.map(i => ({
      ID: i._id.toString(),
      Tipo: i.type,
      Estado: i.status,
      Cliente: i.clientId?.toString(),
      Asunto: i.subject,
      Fecha: i.creationDate ? new Date(i.creationDate).toLocaleDateString() : '',
      TiempoEstimado: i.estimatedTime || 0,
      TiempoReal: i.actualTime || 0
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Incidentes');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename=incidentes.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ message: 'Error al exportar incidentes', error: error.message });
  }
});

// Actualizar incidente
router.put('/:id', authMiddleware, totalAccessMiddleware, async (req, res) => {
  const {
    clientId, userId, executiveId, assignedUserId, contactNumber,
    type, subject, detail, observation, attachments, order,
    estimatedTime, actualTime, status, completionDate
  } = req.body;

  try {
    const incident = await Incident.findByIdAndUpdate(
      req.params.id,
      {
        clientId,
        userId,
        executiveId,
        assignedUserId,
        contactNumber,
        type,
        subject,
        detail,
        observation,
        attachments,
        order,
        estimatedTime,
        actualTime,
        status,
        completionDate
      },
      { new: true }
    );

    if (!incident) return res.status(404).json({ message: 'Incidente no encontrado' });
    res.json(incident);
  } catch (error) {
    res.status(400).json({ message: 'Error al actualizar incidente', error: error.message });
  }
});

// Eliminar incidente
router.delete('/:id', authMiddleware, totalAccessMiddleware, async (req, res) => {
  try {
    const incident = await Incident.findByIdAndDelete(req.params.id);
    if (!incident) return res.status(404).json({ message: 'Incidente no encontrado' });
    res.json({ message: 'Incidente eliminado' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar incidente', error: error.message });
  }
});

module.exports = router;