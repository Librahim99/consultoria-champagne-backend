const ranks = {
  TOTALACCESS: 'CEO',
  CONSULTOR: 'Consultor',
  CONSULTORCHIEF:'Jefe de Consultoría',
  CONSULTORJR: 'Consultor Junior',
  DEV: 'Desarrollador',
  DEVCHIEF: 'Jefe de Programación',
  ADMIN: 'Administración',
  GUEST: 'Invitado',
  MKT: 'Marketing'
};

const incident_status = {
  PENDING: 'Pendiente',
  IN_PROGRESS: 'En Proceso',
  TEST:'Prueba',
  SOLVED: 'Resuelto',
  TO_BUDGET: 'Presupuestar',
  BUDGETED: 'Presupuestado',
  REVISION: 'Revisión',
  CANCELLED: 'Cancelado'
};

const pending_status = {
  PENDING: 'Pendiente',
  IN_PROGRESS: 'En Proceso',
  TO_BUDGET: 'Presupuestar',
  DEV: 'En Programación',
  TEST:'Prueba',
  CANCELLED: 'Cancelado',
  SOLVED: 'Resuelto'
};

const incident_types = {
  TICKET: 'Whatsapp Ticket',
  DEV_BUG: 'Falla',
  DEV_IMPROVEMENT: 'Mejora',
  DEV_NEW: 'Nueva opción'
}

const priority_levels = {
  1: 'Urgente e Importante',
  2: 'Urgente',
  3: 'Importante',
  4: 'Ni Urgente ni Importante',
  5: 'Sin prioridad'
};

const budget_status = {
  DRAFT: 'Borrador',
  IN_REVIEW: 'En Revisión',
  APPROVED: 'Aprobado',
  REJECTED: 'Rechazado',
  SENT: 'Enviado',
  ACCEPTED: 'Aceptado',
  LOST: 'Perdido',
  EXPIRED: 'Vencido'
};

module.exports = { ranks,incident_status,incident_types, pending_status, priority_levels, budget_status };