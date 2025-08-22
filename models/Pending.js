const mongoose = require('mongoose');
const { pending_status, priority_levels } = require('../utils/enums');

const pendingSchema = new mongoose.Schema({
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: [true, 'El ID del cliente es obligatorio.']
  },
  date: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    required: [true, 'El estado es obligatorio.'],
    enum: {
      values: Object.keys(pending_status),
      message: 'Estado inválido: {VALUE}.'
    }
  },
  title: {
    type: String,
    default: ''
  },
  statusDetail: {
    type: String,
    default: ''
  },
  detail: {
    type: String,
    required: [true, 'El detalle es obligatorio.'],
    trim: true
  },
  observation: {
    type: String,
    default: ''
  },
  incidentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Incident',
    default: null
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'El ID del usuario es obligatorio.']
  },
  assignedUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  completionDate: {
    type: Date,
    default: null
  },
  estimatedDate: {
      type: Date,
      default: null
    },
  incidentNumber: {
    type: String,
    trim: true
  },
  sequenceNumber: {
    type: Number,
    required: true,
    unique: true
  },
  notifications: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: [] 
  }],
  priority: {
    type: Number,
    required: [true, 'El nivel de prioridad es obligatorio.'],
    enum: {
      values: Object.keys(priority_levels).map(key => parseInt(key)),  // Usamos keys como números
      message: 'Prioridad inválida: {VALUE}.'
    },
    default: 5  // Default a SIN PRIORIDAD
  },
  checklist: [{
    action: {
      type: String,
      required: [true, 'La descripción de la acción es obligatoria.'],
      trim: true
    },
    completed: {
      type: Boolean,
      default: false
    },
    creationDate: {
      type: Date,
      default: null
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    completionDate: {
      type: Date,
      default: null
    },
    completedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  }],comments: [{
    text: {
      type: String,
      required: [true, 'El texto del comentario es obligatorio.'],
      trim: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'El ID del usuario que agrega el comentario es obligatorio.']
    },
    date: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
  
});

module.exports = mongoose.model('Pending', pendingSchema);