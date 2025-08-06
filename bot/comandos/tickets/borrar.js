const {model} = require('../../../utils/model');
const Incident = model('Incident');

const { responderOk, responderError, responderAdvertencia, MESSAGES } = require('../../../utils/respuestas');
const { ranks } = require('../../../utils/enums');

module.exports = {
  comando: ['borrar', 'eliminarticket'],
  descripcion: 'Elimina un ticket de forma permanente',
  ejemplo: '!borrar 1234',
  uso: '!borrar <nro_ticket>',
  requiereAuth: true,
  requiereGrupo: true,

  async ejecutar({ bot, mensaje, argumentos, usuario }) {
    try {
      const rolesPermitidos = [ranks.TOTALACCESS, ranks.DEVCHIEF];

      if (!rolesPermitidos.includes(usuario.rank)) {
        return responderError(bot, mensaje, MESSAGES.NO_PERMISOS(usuario.rank));
      }

      const nroTicket = argumentos[0];
      if (!nroTicket) {
        return responderAdvertencia(bot, mensaje, MESSAGES.FORMATO_BORRAR_INVALIDO);
      }

      const incidente = await Incident.findOne({ sequenceNumber: nroTicket });
      if (!incidente) {
        return responderError(bot, mensaje, MESSAGES.TICKET_NO_ENCONTRADO(nroTicket));
      }

      await incidente.deleteOne();
      await responderOk(bot, mensaje, MESSAGES.TICKET_BORRADO(nroTicket));
    } catch (error) {
      console.error('❌ Error en comando !borrar:', error);
      responderError(bot, mensaje, MESSAGES.ERROR_BORRAR);
    }
  }
};