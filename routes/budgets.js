const express = require('express');
const router = express.Router();
const Budget = require('../models/Budget');
const authMiddleware = require('../middleware/authMiddleware');
const { ranks, budget_status } = require('../utils/enums');
const Client = require('../models/Client');
const escapeRegex = (s = '') => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// === Middlewares ===
const totalAccessMiddleware = (req, res, next) => {
  // Misma idea que en tus otras rutas: bloquear Invitado cuando es acción sensible
  if (req.user?.rank === ranks.GUEST) {
    return res.status(403).json({ message: 'Acceso denegado. Requiere Acceso Total' });
  }
  next();
};

const clean = s => (typeof s === 'string' ? s.replace(/[<>]/g,'').trim() : s);

// === Listar con filtros/paginado ===
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { q, status, clientName, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status && Object.keys(budget_status).includes(status)) filter.status = status;
    if (clientName) filter.clientName = new RegExp(clean(clientName), 'i');
    if (q) {
      const word = clean(q);
      Object.assign(filter, {
        $or: [
          { clientName: new RegExp(word, 'i') },
          { notes: new RegExp(word, 'i') },
          { terms: new RegExp(word, 'i') }
        ]
      });
    }
    const skip = (Number(page) - 1) * Number(limit);
    const [rows, total] = await Promise.all([
      Budget.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Budget.countDocuments(filter)
    ]);
    res.json({ rows, total, page: Number(page) });
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener presupuestos', error: error.message });
  }
});

// === Obtener por id ===
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const doc = await Budget.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'No encontrado' });
    res.json(doc);
  } catch (err) {
    res.status(400).json({ message: 'Error al obtener presupuesto', error: err.message });
  }
});

// === Crear ===
router.post('/', authMiddleware, totalAccessMiddleware, async (req, res) => {
  try {
    const body = req.body || {};

    // Ahora solo exigimos clientName + items[]
    if (!body.clientName || !Array.isArray(body.items) || body.items.length === 0) {
      return res.status(400).json({ message: 'Campos requeridos: clientName, items[]' });
    }

    // Resolver clientId por nombre si no vino
    let resolvedClientId = body.clientId ?? null;  // ← ESTA LÍNEA DEBE ESTAR
    if (!resolvedClientId && body.clientName) {
      const match = await Client.findOne(
        { name: { $regex: `^${escapeRegex(body.clientName)}$`, $options: 'i' } },
        { _id: 1 }
      );
      if (match) resolvedClientId = match._id;
    }

    const last = await Budget.findOne().sort({ code: -1 }).select('code');
    const code = (last?.code || 1000) + 1;

    const doc = new Budget({
      code,
      clientId: resolvedClientId, // puede ser null
      clientName: clean(body.clientName),
      currency: body.currency || 'ARS',
      items: body.items.map(it => ({
        description: clean(it.description),
        qty: Number(it.qty) || 0,
        unitPrice: Number(it.unitPrice) || 0,
        unit: clean(it.unit) || 'unidad',
        taxRate: Math.min(Math.max(Number(it.taxRate) || 0, 0), 1),
      })),
      discountFixed: Math.max(0, Number(body.discountFixed) || 0),
      validUntil: body.validUntil ? new Date(body.validUntil) : undefined,
      terms: clean(body.terms),
      notes: clean(body.notes),
      status: 'DRAFT',
      createdBy: req.user.id,
      history: [{ action: 'create', userId: req.user.id, userName: req.user?.username || '' }],
    });

    await doc.save();
    res.status(201).json(doc);
  } catch (error) {
    console.error('Budget create error:', error); // útil para ver el detalle en consola
    res.status(400).json({ message: 'Error al crear presupuesto', error: error.message });
  }
});


// === Editar (solo DRAFT o REJECTED; mismo “tono” que tus rutas) ===
router.put('/:id', authMiddleware, totalAccessMiddleware, async (req, res) => {
  try {
    const doc = await Budget.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'No encontrado' });

    // Evitar editar estados “cerrados”
    if (!['DRAFT','REJECTED'].includes(doc.status) && req.user?.rank === ranks.CONSULTORJR) {
      return res.status(409).json({ message: 'No editable en este estado' });
    }

    const b = req.body || {};
    if (b.clientName) doc.clientName = clean(b.clientName);
    if (b.currency) doc.currency = b.currency;
    if (Array.isArray(b.items)) {
      doc.items = b.items.map(it => ({
        description: clean(it.description),
        qty: Number(it.qty)||0,
        unitPrice: Number(it.unitPrice)||0,
        unit: clean(it.unit)||'unidad',
        taxRate: Math.min(Math.max(Number(it.taxRate)||0,0),1)
      }));
    }
    if (b.discountFixed !== undefined) {
      doc.discountFixed = Math.max(0, Number(b.discountFixed) || 0);
    }
    
    if (b.validUntil) doc.validUntil = new Date(b.validUntil);
    if (b.terms !== undefined) doc.terms = clean(b.terms);
    if (b.notes !== undefined) doc.notes = clean(b.notes);

    doc.history.push({ action: 'update', userId: req.user.id, userName: req.user?.username || '' });
    await doc.save();
    res.json(doc);
  } catch (error) {
    res.status(400).json({ message: 'Error al actualizar presupuesto', error: error.message });
  }
});

// === Workflow ===
// Enviar a revisión
router.post('/:id/submit', authMiddleware, totalAccessMiddleware, async (req,res)=>{
  try {
    const doc = await Budget.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'No encontrado' });
    if (!['DRAFT','REJECTED'].includes(doc.status)) {
      return res.status(409).json({ message: 'Estado inválido para enviar' });
    }
    doc.status = 'IN_REVIEW';
    doc.history.push({ action: 'submit', userId: req.user.id, userName: req.user?.username || '' });
    await doc.save();
    res.json(doc);
  } catch (err) {
    res.status(400).json({ message: 'Error al enviar a revisión', error: err.message });
  }
});

// Aprobar
router.post('/:id/approve', authMiddleware, totalAccessMiddleware, async (req,res)=>{
  try {
    // Solo Admin o Jefe de Consultoría
    if (![ranks.ADMIN, ranks.CONSULTORCHIEF, ranks.TOTALACCESS].includes(req.user?.rank)) {
      return res.status(403).json({ message: 'Acción no permitida para tu rol' });
    }
    const doc = await Budget.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'No encontrado' });
    if (doc.status !== 'IN_REVIEW') return res.status(409).json({ message: 'No está en revisión' });
    doc.status = 'APPROVED';
    doc.approvedBy = req.user.id;
    doc.history.push({ action: 'approve', userId: req.user.id, userName: req.user?.username || '' });
    await doc.save();
    res.json(doc);
  } catch (err) {
    res.status(400).json({ message: 'Error al aprobar', error: err.message });
  }
});

// Rechazar
router.post('/:id/reject', authMiddleware, totalAccessMiddleware, async (req,res)=>{
  try {
    if (![ranks.ADMIN, ranks.CONSULTORCHIEF, ranks.TOTALACCESS].includes(req.user?.rank)) {
      return res.status(403).json({ message: 'Acción no permitida para tu rol' });
    }
    const doc = await Budget.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'No encontrado' });
    if (doc.status !== 'IN_REVIEW') return res.status(409).json({ message: 'No está en revisión' });
    doc.status = 'REJECTED';
    doc.history.push({ action: 'reject', userId: req.user.id, userName: req.user?.username || '', notes: clean(req.body?.notes) });
    await doc.save();
    res.json(doc);
  } catch (err) {
    res.status(400).json({ message: 'Error al rechazar', error: err.message });
  }
});

// Marcar Enviado
router.post('/:id/send', authMiddleware, totalAccessMiddleware, async (req,res)=>{
  try {
    const doc = await Budget.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'No encontrado' });
    if (doc.status !== 'APPROVED') return res.status(409).json({ message: 'Debe estar aprobado' });
    doc.status = 'SENT';
    doc.sentAt = new Date();
    doc.history.push({ action: 'send', userId: req.user.id, userName: req.user?.username || '' });
    await doc.save();
    res.json(doc);
  } catch (err) {
    res.status(400).json({ message: 'Error al marcar enviado', error: err.message });
  }
});

// Aceptar
router.post('/:id/accept', authMiddleware, totalAccessMiddleware, async (req,res)=>{
  try {
    if (![ranks.ADMIN, ranks.CONSULTORCHIEF, ranks.TOTALACCESS].includes(req.user?.rank)) {
      return res.status(403).json({ message: 'Acción no permitida para tu rol' });
    }
    const doc = await Budget.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'No encontrado' });
    if (!['SENT','APPROVED'].includes(doc.status)) return res.status(409).json({ message: 'Debe estar enviado o aprobado' });
    doc.status = 'ACCEPTED';
    doc.acceptedAt = new Date();
    doc.history.push({ action: 'accept', userId: req.user.id, userName: req.user?.username || '' });
    await doc.save();
    res.json(doc);
  } catch (err) {
    res.status(400).json({ message: 'Error al aceptar', error: err.message });
  }
});

router.get('/ping', (req, res) => res.json({ ok: true }));

// Perdido
router.post('/:id/lose', authMiddleware, totalAccessMiddleware, async (req,res)=>{
  try {
    if (![ranks.ADMIN, ranks.CONSULTORCHIEF, ranks.TOTALACCESS].includes(req.user?.rank)) {
      return res.status(403).json({ message: 'Acción no permitida para tu rol' });
    }
    const doc = await Budget.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'No encontrado' });
    doc.status = 'LOST';
    doc.lostAt = new Date();
    doc.history.push({ action: 'lose', userId: req.user.id, userName: req.user?.username || '', notes: clean(req.body?.reason) });
    await doc.save();
    res.json(doc);
  } catch (err) {
    res.status(400).json({ message: 'Error al marcar perdido', error: err.message });
  }
});

// Expirar en batch (para CRON)
router.post('/expire/run', authMiddleware, totalAccessMiddleware, async (req,res)=>{
  try {
    const now = new Date();
    const { modifiedCount } = await Budget.updateMany(
      { validUntil: { $lt: now }, status: { $in: ['DRAFT','IN_REVIEW','APPROVED','SENT'] } },
      { $set: { status: 'EXPIRED' }, $push: { history: { action: 'expire', at: now } } }
    );
    res.json({ expired: modifiedCount });
  } catch (err) {
    res.status(400).json({ message: 'Error al expirar presupuestos', error: err.message });
  }
});

module.exports = router;
