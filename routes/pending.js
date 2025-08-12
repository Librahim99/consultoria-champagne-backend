const express = require('express');
const router = express.Router();
const moment = require('moment'); // Asume instalado; si no, npm i moment

const Pending = require('../models/Pending');
const Client = require('../models/Client');
const User = require('../models/User');

const authMiddleware = require('../middleware/authMiddleware');
const { ranks, pending_status } = require('../utils/enums');


const totalAccessMiddleware = (req, res, next) => {
  if (req.user.rank === ranks.GUEST) {
    return res.status(403).json({ message: 'Acceso denegado. Requiere Acceso Total' });
  }
  next();
};

const statusReverseMap = {};
for (const key in pending_status) {
  statusReverseMap[pending_status[key]] = key;
}

// 📌 Crear pendiente
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

// 📊 Obtener todos los pendientes con filtros
router.get('/', authMiddleware, async (req, res) => {
  try {

    const filtro = {};
    const filtroAsignado = {};
const { userFilter = 'me', dateFilter = 'week', statusFilter = 'pending_inprogress', status, clientId, desde, hasta } = req.query;

// User filter
if (userFilter === 'me' && req.user) {
  filtro.userId = req.user.id;
  filtroAsignado.assignedUserId = req.user.id
} // 'all' no agrega filtro

// Date filter (prioriza sobre desde/hasta)
if (dateFilter !== 'all') {
  const now = moment();
  let startDate;
  if (dateFilter === 'week') {
    startDate = now.startOf('isoWeek'); // Lunes
  } else if (dateFilter === 'month') {
    startDate = now.startOf('month');
  }
  filtro.date = { $gte: startDate.toDate() };
} else if (desde || hasta) {
  filtro.date = {};
  if (desde) filtro.date.$gte = new Date(desde);
  if (hasta) filtro.date.$lte = new Date(hasta);
}

// Status filter (prioriza sobre status query legacy)
let statusValues = [];
if (statusFilter !== 'all') {
  switch (statusFilter) {
    case 'pending_inprogress':
      statusValues = ['PENDING', 'IN_PROGRESS'];
      break;
    case 'tobudget_budgeted':
      statusValues = ['TO_BUDGET', 'BUDGETED'];
      break;
    case 'test_revision':
      statusValues = ['TEST', 'REVISION'];
      break;
    case 'solved_cancelled':
      statusValues = ['SOLVED', 'CANCELLED'];
      break;
  }
  filtro.status = { $in: statusValues };
} else if (status) {
  filtro.status = status;
}

if (clientId) filtro.clientId = clientId;

    if (desde || hasta) {
      filtro.date = {};
      if (desde) filtro.date.$gte = new Date(desde);
      if (hasta) filtro.date.$lte = new Date(hasta);
    }

    let pendings = await Pending.find(filtro)
    // .populate('clientId userId assignedUserId incidentId')
    const pendingsAssigned = await Pending.find(filtroAsignado)
    pendingsAssigned.forEach(assignedPending => {
      pendings.push(assignedPending)
    });
    // .sort({ date: -1 });

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

    res.json(updated);
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

// 📊 Obtener cantidad de pendientes por estado
router.get('/por-estado', authMiddleware, async (req, res) => {
  try {
    const resultado = await Pending.aggregate([
      {
        $group: {
          _id: '$status',
          total: { $sum: 1 }
        }
      },
      {
        $project: {
          estado: {
            $switch: {
              branches: Object.entries(pending_status).map(([key, label]) => ({
                case: { $eq: ['$_id', key] },
                then: label
              })),
              default: 'Desconocido'
            }
          },
          total: 1,
          _id: 0
        }
      }
    ]);

    res.json(resultado);
  } catch (error) {
    console.error('❌ Error al agrupar pendientes por estado:', error);
    res.status(500).json({ message: 'Error al obtener métricas', error: error.message });
  }
});

router.post('/import-array', async (req, res) => {
  const pendientesArray = req.body;
  if (!Array.isArray(pendientesArray) || !pendientesArray.length) {
    return res.status(400).json({ message: 'No se envió ningún array' });
  }

  try {
    const lastPending = await Pending.findOne().sort({ sequenceNumber: -1 });
    let nextPendingNumber = lastPending ? lastPending.sequenceNumber + 1 : 1;

    const pendientesCreados = [];

    for (const pending of pendientesArray) {
      const statusKey = statusReverseMap[pending.status?.trim()];
      if (!statusKey) {
        console.warn(`⛔ Estado inválido: ${pending.status}`);
        continue;
      }
    

      const client = await Client.findOne({ common: pending.common });
      const user = await User.findOne({ username: pending.username });
      const assignedUser = pending.assignedTo
        ? await User.findOne({ username: pending.assignedTo })
        : null;

      if (!client || !user) {
        console.warn(`⛔ Saltando: cliente o usuario no encontrado`, pending);
        continue;
      }

      try {
        const nuevoPendiente = new Pending({
          clientId: client._id,
          date: pending.date ? new Date(pending.date) : new Date(),
          status: statusKey,
          detail: pending.detail,
          observation: pending.observation || '',
          incidentNumber: pending.incidentNumber || null,
          userId: user._id,
          assignedUserId: assignedUser ? assignedUser._id : null,
          sequenceNumber: nextPendingNumber++,
        });

        await nuevoPendiente.save();
        pendientesCreados.push(nuevoPendiente);
        console.log(`✔️ Pendiente n° ${nuevoPendiente.sequenceNumber} creado`);
      } catch (err) {
        console.error(`❌ Error al crear pendiente n° ${nextPendingNumber - 1}`, err);
      }
    }

    if (pendientesCreados.length === 0) {
      return res.status(400).json({ message: 'No se pudo importar ningún pendiente válido' });
    }

    res.status(201).json({
      message: `✔️ Se importaron ${pendientesCreados.length} pendientes correctamente`,
      cantidad: pendientesCreados.length,
    });
  } catch (err) {
    console.error('❌ Error general en importación:', err);
    res.status(500).json({ message: 'Error al importar pendientes', error: err.message });
  }
});

// 🔄 Cambiar solo el estado de un pendiente
router.patch('/:id/status', authMiddleware, async (req, res) => {
  const { status } = req.body;
  try {
    if (!status) {
      return res.status(400).json({ message: 'El campo status es requerido.' });
    }

    // Validar que el status sea válido según el enum
    if (!Object.keys(pending_status).includes(status)) {
      return res.status(400).json({ message: `Estado inválido: ${status}. Los valores permitidos son: ${Object.keys(pending_status).join(', ')}.` });
    }

    const updated = await Pending.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true } // Asegura que se validen los cambios
    );

    if (!updated) {
      return res.status(404).json({ message: 'Pendiente no encontrado.' });
    }

    res.json(updated);
  } catch (error) {
    console.error('Error al cambiar estado del pendiente:', error);
    res.status(400).json({ message: 'Error al cambiar estado', error: error.message });
  }
});


router.patch('/:id/assign', authMiddleware, async (req, res) => {
  const { assignedUserId } = req.body;
  try {
    if (!assignedUserId) {
      return res.status(400).json({ message: 'El campo ID asignado es requerido.' });
    }

    const assigned = await User.findById(assignedUserId)
    if(!assigned){
      return res.status(400).json({ message: 'No se encontró usuario para asignar' });
    }

    const updated = await Pending.findByIdAndUpdate(
      req.params.id,
      { assignedUserId: assigned._id },
      { new: true, runValidators: true } // Asegura que se validen los cambios
    );

    if (!updated) {
      return res.status(404).json({ message: 'Pendiente no encontrado.' });
    }

    res.json(updated);
  } catch (error) {
    console.error('Error al asignar el pendiente:', error);
    res.status(400).json({ message: 'Error al asignar el pendiente', error: error.message });
  }
});


module.exports = router;