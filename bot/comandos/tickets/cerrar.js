const {model} = require('../../../utils/model');
const Incident = model('Incident');

const { responderOk, responderError, responderAdvertencia, MESSAGES } = require('../../../utils/respuestas');
const { ranks, incident_status } = require('../../../utils/enums');

module.exports = {
  comando: ['cerrar', 'cerrarticket'],
  descripcion: 'Cierra un ticket marcándolo como resuelto',
  ejemplo: '!cerrar 1234 Ticket resuelto con éxito',
  uso: '!cerrar <nro_ticket> <detalle>',
  requiereAuth: true,
  requiereGrupo: true,

  async ejecutar({ bot, mensaje, argumentos, remitente, usuario }) {
    try {
      const rolesPermitidos = [
        ranks.TOTALACCESS,
        ranks.CONSULTOR,
        ranks.CONSULTORCHIEF,
        ranks.DEV,
        ranks.DEVCHIEF
      ];

      if (!rolesPermitidos.includes(usuario.rank)) {
        return responderError(bot, mensaje, MESSAGES.NO_PERMISOS(usuario.rank));
      }

      const [nroTicket, ...detalleArray] = argumentos;
      const detalle = detalleArray.join(' ');

      if (!nroTicket || !detalle) {
        return responderAdvertencia(bot, mensaje, MESSAGES.FORMATO_CERRAR_INVALIDO);
      }

      const incidente = await Incident.findOne({ sequenceNumber: nroTicket });
      if (!incidente) {
        return responderError(bot, mensaje, MESSAGES.TICKET_NO_ENCONTRADO(nroTicket));
      }

      if (incidente.status === incident_status.SOLVED) {
        return responderAdvertencia(bot, mensaje, MESSAGES.TICKET_YA_CERRADO(nroTicket));
      }

      incidente.status = incident_status.SOLVED;
      incidente.observation = `${incidente.observation || ''}\n[🟢 Cerrado por ${usuario.username}]: ${detalle}`;
      incidente.completionDate = new Date();
      await incidente.save();

      await responderOk(bot, mensaje, MESSAGES.TICKET_CERRADO(nroTicket));
    } catch (error) {
      console.error('❌ Error en comando !cerrar:', error);
      responderError(bot, mensaje, MESSAGES.ERROR_CERRAR);
    }
  }
};