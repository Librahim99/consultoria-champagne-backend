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
  TEST:'Prueba',
  SOLVED: 'Resuelto',
  DEV: 'En Programación',
  TO_BUDGET: 'Presupuestar',
  BUDGETED: 'Presupuestado',
  REVISION: 'Revisión',
  CANCELLED: 'Cancelado'
};

const incident_types = {
  TICKET: 'Whatsapp Ticket',
  DEV_BUG: 'Falla',
  DEV_IMPROVEMENT: 'Mejora',
  DEV_NEW: 'Nueva opción'
}

module.exports = { ranks,incident_status,incident_types, pending_status };