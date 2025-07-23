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

// Actualizar cliente
router.put('/:id', authMiddleware, totalAccessMiddleware, async (req, res) => {
  const { name, common, vip, active } = req.body;

  try {
    const client = await Client.findByIdAndUpdate(
      req.params.id,
      { name, common, vip, active, lastUpdate: Date.now() },
      { new: true }
    );
    if (!client) {
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }
    res.json(client);
  } catch (error) {
    res.status(400).json({ message: 'Error al actualizar cliente', error: error.message });
  }
});

// Eliminar cliente
router.delete('/:id', authMiddleware, totalAccessMiddleware, async (req, res) => {
  try {
    const client = await Client.findByIdAndDelete(req.params.id);
    if (!client) {
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }
    res.json({ message: 'Cliente eliminado' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar cliente', error: error.message });
  }
});

module.exports = router;