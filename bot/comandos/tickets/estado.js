const model = require('../../utils/model');
const Incident = model('Incident');
const { responderOk, responderError, responderAdvertencia } = require('../../utils/respuestas');
const { ranks, incident_status } = require('../../utils/enums');

module.exports = {
  comando: ['estado', 'cambiarestado', 'setestado'],
  descripcion: 'Cambia el estado de un ticket',
  ejemplo: '!estado 1234 en progreso',
  uso: '!estado <nro_ticket> <nuevo_estado>',
  requiereAuth: true,

  async ejecutar({ bot, mensaje, argumentos, usuario }) {
    const nroTicket = argumentos[0];
    const nuevoEstado = argumentos.slice(1).join(' ').trim().toLowerCase();

    const rolesPermitidos = [ranks.TOTALACCESS, ranks.CONSULTORCHIEF, ranks.DEVCHIEF];
    if (!rolesPermitidos.includes(usuario.rank)) {
      return responderError(bot, mensaje, '⛔ No tenés permisos para cambiar el estado de un ticket.');
    }

    if (!nroTicket || !nuevoEstado) {
      return responderAdvertencia(bot, mensaje, '⚠️ Uso correcto: !estado <nro_ticket> <nuevo_estado>');
    }

    const valoresPermitidos = Object.values(incident_status);
    if (!valoresPermitidos.includes(nuevoEstado)) {
      return responderAdvertencia(bot, mensaje, `❌ Estado inválido. Usá uno de: ${valoresPermitidos.join(', ')}`);
    }

    const ticket = await Incident.findOne({ sequenceNumber: nroTicket });
    if (!ticket) {
      return responderError(bot, mensaje, `🚫 No se encontró el ticket N°${nroTicket}`);
    }

    const anterior = ticket.status;
    ticket.status = nuevoEstado;
    await ticket.save();

    await responderOk(bot, mensaje, `📌 Estado del ticket N°${nroTicket} actualizado:\n*${anterior} ➜ ${nuevoEstado}*`);
  }
};
