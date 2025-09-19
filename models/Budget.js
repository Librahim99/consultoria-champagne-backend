// models/Budget.js
const mongoose = require('mongoose');
const { budget_status } = require('../utils/enums');

const BudgetItemSchema = new mongoose.Schema({
  description: { type: String, required: true, trim: true, maxlength: 500 },
  qty: { type: Number, required: true, min: 0 },
  unitPrice: { type: Number, required: true, min: 0 },
  unit: { type: String, default: 'unidad', trim: true, maxlength: 50 },
  taxRate: { type: Number, default: 0, min: 0, max: 1 } // 0..1
}, { _id: false });

const HistorySchema = new mongoose.Schema({
  at: { type: Date, default: Date.now },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  userName: { type: String, trim: true, maxlength: 120 },
  action: { type: String, trim: true, maxlength: 40, required: true },
  notes: { type: String, trim: true, maxlength: 1000 }
}, { _id: false });

const BudgetSchema = new mongoose.Schema({
  code: { type: Number, index: true }, // autoincremental simple
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  clientName: { type: String, required: true, trim: true, maxlength: 200 },
  currency: { type: String, enum: ['ARS','USD'], default: 'ARS' },
  items: { type: [BudgetItemSchema], default: [], validate: v => Array.isArray(v) && v.length > 0 },
  subtotal: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  validUntil: { type: Date },
  terms: { type: String, trim: true, maxlength: 2000 },
  notes: { type: String, trim: true, maxlength: 2000 },
  status: {
    type: String,
    enum: Object.keys(budget_status), // ej: 'DRAFT', 'IN_REVIEW', ...
    default: 'DRAFT',
    index: true
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  sentAt: { type: Date },
  acceptedAt: { type: Date },
  lostAt: { type: Date },
  history: { type: [HistorySchema], default: [] }
}, { timestamps: true });

BudgetSchema.methods.recalcTotals = function () {
  const subtotal = this.items.reduce((acc, it) => acc + (it.qty * it.unitPrice), 0);
  const tax = this.items.reduce((acc, it) => acc + (it.qty * it.unitPrice * (it.taxRate || 0)), 0);
  this.subtotal = Number(subtotal.toFixed(2));
  this.tax = Number(tax.toFixed(2));
  this.total = Number((subtotal + tax).toFixed(2));
};

BudgetSchema.pre('save', function(next) {
  // limpiar HTML básico en strings sensibles
  const clean = s => (typeof s === 'string' ? s.replace(/[<>]/g,'').trim() : s);
  if (this.clientName) this.clientName = clean(this.clientName);
  if (this.terms !== undefined) this.terms = clean(this.terms);
  if (this.notes !== undefined) this.notes = clean(this.notes);
  if (Array.isArray(this.items)) {
    this.items = this.items.map(it => ({ ...it, description: clean(it.description) }));
  }
  this.recalcTotals();
  next();
});

module.exports = mongoose.model('Budget', BudgetSchema);
