const model = require('../../../utils/model');
const Incident = model('Incident');

const { responderOk, responderError, responderAdvertencia } = require('../../../utils/respuestas');
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
        return responderError(bot, mensaje, '⛔ No tenés permisos para cerrar tickets.');
      }

      const [nroTicket, ...detalleArray] = argumentos;
      const detalle = detalleArray.join(' ');

      if (!nroTicket || !detalle) {
        return responderAdvertencia(bot, mensaje, '❗ Formato inválido. Usá: !cerrar <nro_ticket> <detalle>');
      }

      const incidente = await Incident.findOne({ sequenceNumber: nroTicket });
      if (!incidente) {
        return responderError(bot, mensaje, `🔍 No se encontró el ticket N°${nroTicket}`);
      }

      if (incidente.status === incident_status.SOLVED) {
        return responderAdvertencia(bot, mensaje, `ℹ️ El ticket N°${nroTicket} ya está cerrado.`);
      }

      incidente.status = incident_status.SOLVED;
      incidente.observation = `${incidente.observation || ''}\n[🟢 Cerrado por ${usuario.username}]: ${detalle}`;
      incidente.completionDate = new Date();
      await incidente.save();

      await responderOk(bot, mensaje, `✅ Ticket N°${nroTicket} cerrado correctamente.`);
    } catch (error) {
      console.error('❌ Error en comando !cerrar:', error);
      responderError(bot, mensaje, '🚨 Ocurrió un error al cerrar el ticket.');
    }
  }
};
