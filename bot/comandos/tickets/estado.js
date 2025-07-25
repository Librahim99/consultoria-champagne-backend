const {model} = require('../../../utils/model');
const Incident = model('Incident');
const { responderOk, responderError, responderAdvertencia, MESSAGES } = require('../../../utils/respuestas');
const { ranks, incident_status } = require('../../../utils/enums');

module.exports = {
  comando: ['estado', 'cambiarestado', 'setestado'],
  descripcion: 'Cambia el estado de un ticket',
  ejemplo: '!estado 1234 en progreso',
  uso: '!estado <nro_ticket> <nuevo_estado>',
  requiereAuth: true,

  async ejecutar({ bot, mensaje, argumentos, usuario }) {
    try {
      const rolesPermitidos = [ranks.TOTALACCESS, ranks.CONSULTORCHIEF, ranks.DEVCHIEF];
      if (!rolesPermitidos.includes(usuario.rank)) {
        return responderError(bot, mensaje, MESSAGES.NO_PERMISOS(usuario.rank));
      }

      const nroTicket = argumentos[0];
      const nuevoEstado = argumentos.slice(1).join(' ').trim();
      console.log(nuevoEstado)

      if (!nroTicket || !nuevoEstado) {
        return responderAdvertencia(bot, mensaje, MESSAGES.FORMATO_ESTADO_INVALIDO);
      }

      const valoresPermitidos = Object.values(incident_status);
      if (!valoresPermitidos.includes(nuevoEstado)) {
        return responderAdvertencia(bot, mensaje, MESSAGES.ESTADO_INVALIDO(valoresPermitidos.join(', ')));
      }

      const ticket = await Incident.findOne({ sequenceNumber: nroTicket });
      if (!ticket) {
        return responderError(bot, mensaje, MESSAGES.TICKET_NO_ENCONTRADO(nroTicket));
      }

      const anterior = ticket.status;
      ticket.status = nuevoEstado;
      await ticket.save();

      await responderOk(bot, mensaje, MESSAGES.ESTADO_ACTUALIZADO(nroTicket, anterior, nuevoEstado));
    } catch (error) {
      console.error('❌ Error en comando !estado:', error);
      responderError(bot, mensaje, MESSAGES.ERROR_ESTADO);
    }
  }
};