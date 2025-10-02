const { Schema, model } = require('mongoose');
const { budget_status } = require('../utils/enums');

const ItemSchema = new Schema({
  description: { type: String, trim: true, required: true },
  qty:        { type: Number, default: 0 },      // horas
  unitPrice:  { type: Number, default: 0 },      // ARS
  unit:       { type: String, trim: true, default: 'hora' },
  taxRate:    { type: Number, default: 0, min: 0, max: 1 }, // 0..1
}, { _id: false });

const BudgetSchema = new Schema({
  code:       { type: Number, required: true, unique: true, index: true },
  clientId:   { type: Schema.Types.ObjectId, ref: 'Client', required: false, default: null },
  clientName: { type: String, required: true, trim: true },
  currency:   { type: String, default: 'ARS' },

  items:      { type: [ItemSchema], default: [] },

  // Descuento fijo en ARS (aplicado luego del subtotal+impuestos)
  discountFixed: { type: Number, default: 0, min: 0 },

  validUntil: { type: Date },
  terms:      { type: String, default: '' },
  notes:      { type: String, default: '' },

  status: { 
    type: String,
    enum: ['DRAFT','IN_REVIEW','APPROVED','REJECTED','SENT','ACCEPTED','LOST','EXPIRED'],
    default: 'DRAFT',
    index: true
  },

  createdBy:  { type: Schema.Types.ObjectId, ref: 'User' },
  approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  sentAt:     Date,
  acceptedAt: Date,
  lostAt:     Date,

  history: [{
    action:   { type: String, trim: true },
    userId:   { type: Schema.Types.ObjectId, ref: 'User' },
    userName: { type: String, trim: true },
    notes:    { type: String, trim: true },
    at:       { type: Date, default: Date.now }
  }]
}, { timestamps: true });

module.exports = model('Budget', BudgetSchema);