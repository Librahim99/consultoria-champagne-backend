const model = require('../../../utils/model');
const Incident = model('Incident');
const User = model('User');

const { responderOk, responderError, responderAdvertencia } = require('../../../utils/respuestas');
const { ranks } = require('../../../utils/enums');

module.exports = {
  comando: ['asignar', 'asignarticket'],
  descripcion: 'Asigna un ticket a un consultor',
  ejemplo: '!asignar 1234 @usuario',
  uso: '!asignar <nro_ticket> <@usuario>',
  requiereAuth: true,
  requiereGrupo: true,

  async ejecutar({ bot, mensaje, argumentos, usuario }) {
    try {
      const rolesPermitidos = [ranks.TOTALACCESS, ranks.CONSULTORCHIEF];

      if (!rolesPermitidos.includes(usuario.rank)) {
        return responderError(bot, mensaje, '⛔ No tenés permisos para asignar tickets.');
      }

      const [nroTicket] = argumentos;

      if (!nroTicket || !mensaje.mentionedJid?.length) {
        return responderAdvertencia(bot, mensaje, '⚠️ Usá el formato: !asignar <nro_ticket> <@usuario>');
      }

      const incidente = await Incident.findOne({ sequenceNumber: nroTicket });
      if (!incidente) {
        return responderError(bot, mensaje, `🚫 No se encontró el ticket N°${nroTicket}`);
      }

      const numeroAsignado = mensaje.mentionedJid[0].split('@')[0];
      const usuarioAsignado = await User.findOne({ telefono: numeroAsignado });

      if (!usuarioAsignado) {
        return responderError(bot, mensaje, '🚫 El usuario mencionado no está registrado en el sistema.');
      }

      incidente.assignedUserId = usuarioAsignado._id;
      await incidente.save();

      await responderOk(bot, mensaje, `📌 Ticket N°${nroTicket} asignado a ${usuarioAsignado.username}`);
    } catch (error) {
      console.error('❌ Error en comando !asignar:', error);
      responderError(bot, mensaje, '🚨 Ocurrió un error al asignar el ticket.');
    }
  }
};
