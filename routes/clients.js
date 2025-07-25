const express = require('express');
const router = express.Router();
const Client = require('../models/Client');
const authMiddleware = require('../middleware/authMiddleware');
const { ranks } = require('../utils/enums');

// Middleware para verificar rango Acceso Total
const totalAccessMiddleware = (req, res, next) => {
  if (req.user.rank !== ranks.TOTALACCESS) {
    return res.status(403).json({ message: 'Acceso denegado. Requiere Acceso Total' });
  }
  next();
};

// Crear cliente
router.post('/', authMiddleware, totalAccessMiddleware, async (req, res) => {
  const { name, common, vip, active } = req.body;
  try {
    const lastUpdate = new Date()
    const client = new Client({ name, common, vip, active, lastUpdate });
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
  const query = req.params.query;
  try {
    const regex = new RegExp(query, 'i');
    const results = await Client.find({
      $or: [{ name: regex }, { common: regex }]
    });
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
      { name, common, vip, active, lastUpdate: Date.now() },
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

module.exports = router;