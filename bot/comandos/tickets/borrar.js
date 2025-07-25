const model = require('../../../utils/model');
const Incident = model('Incident');

const { responderOk, responderError, responderAdvertencia } = require('../../../utils/respuestas');
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
        return responderError(bot, mensaje, '⛔ No tenés permisos para eliminar tickets.');
      }

      const nroTicket = argumentos[0];
      if (!nroTicket) {
        return responderAdvertencia(bot, mensaje, '⚠️ Debés especificar el número del ticket. Ej: !borrar 1234');
      }

      const incidente = await Incident.findOne({ sequenceNumber: nroTicket });
      if (!incidente) {
        return responderError(bot, mensaje, `🚫 No se encontró el ticket N°${nroTicket}`);
      }

      await incidente.deleteOne();
      await responderOk(bot, mensaje, `🗑️ Ticket N°${nroTicket} eliminado permanentemente.`);
    } catch (error) {
      console.error('❌ Error en comando !borrar:', error);
      responderError(bot, mensaje, '🚨 Ocurrió un error al intentar eliminar el ticket.');
    }
  }
};
