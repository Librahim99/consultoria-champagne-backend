const {model} = require('../../../utils/model');
const Incident = model('Incident');
const User = model('User');

const { responderOk, responderError, responderAdvertencia, MESSAGES } = require('../../../utils/respuestas');
const { ranks } = require('../../../utils/enums');

module.exports = {
  comando: ['asignar', 'asignarticket'],
  descripcion: 'Asigna un ticket a un consultor',
  ejemplo: '!asignar 1234 @usuario',
  uso: '!asignar <nro_ticket> <usuario>',
  requiereAuth: true,
  requiereGrupo: true,

  async ejecutar({ bot, mensaje, argumentos, usuario }) {
    console.log('mensaje ------- ',mensaje)
    console.log('argumentos ------- ',argumentos)
    console.log('usuario ------- ',usuario)
    try {
      const rolesPermitidos = [ranks.TOTALACCESS, ranks.CONSULTORCHIEF];

      if (!rolesPermitidos.includes(usuario.rank)) {
        return responderError(bot, mensaje, MESSAGES.NO_PERMISOS(usuario.rank));
      }

      const nroTicket = argumentos[0];

      if (!nroTicket) {
        return responderAdvertencia(bot, mensaje, MESSAGES.FORMATO_ASIGNAR_INVALIDO);
      }

      const incidente = await Incident.findOne({ sequenceNumber: nroTicket });
      if (!incidente) {
        return responderError(bot, mensaje, MESSAGES.TICKET_NO_ENCONTRADO(nroTicket));
      }

      // const numeroAsignado = mensaje.mentionedJid[0].split('@')[0];
      // console.log('num ------- ',numeroAsignado)
      const usuarioAsignado = await User.findOne({ username: argumentos[1] });

      if (!usuarioAsignado) {
        return responderError(bot, mensaje, MESSAGES.USUARIO_NO_REGISTRADO);
      }

      incidente.assignedUserId = usuarioAsignado._id;
      await incidente.save();

      await responderOk(bot, mensaje, MESSAGES.TICKET_ASIGNADO(nroTicket, usuarioAsignado.username));
    } catch (error) {
      console.error('❌ Error en comando !asignar:', error);
      responderError(bot, mensaje, MESSAGES.ERROR_ASIGNAR);
    }
  }
};