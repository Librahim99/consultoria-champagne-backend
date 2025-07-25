const { model } = require('../../../utils/model');

const Ticket = model('Incident');
const Client = model('Client');
const User = model('User');

const { incident_types, incident_status, ranks } = require('../../../utils/enums');
const { responderError, responderOk, MESSAGES } = require('../../../utils/respuestas');

const rolesPermitidos = [
  ranks.TOTALACCESS,
  ranks.CONSULTOR,
  ranks.CONSULTORCHIEF,
  ranks.DEV,
  ranks.DEVCHIEF
];

module.exports = {
  comando: ['crear', 'nuevoticket'], // Agregamos esto para consistencia, opcional pero útil para escalabilidad
  descripcion: 'Crea un nuevo ticket',
  ejemplo: '!ticket crear <common> <detalle>',
  uso: '!ticket crear <common> <detalle>',
  requiereAuth: true,

  async ejecutar({ bot, mensaje, argumentos, usuario }) {
    try {
      if (!rolesPermitidos.includes(usuario.rank)) {
        return responderError(bot, mensaje, MESSAGES.NO_PERMISOS(usuario.rank));
      }

      const [common, ...restArgs] = argumentos;
      let type = incident_types.TICKET; // Default
      let subject = 'Ticket'; // Default fijo
      let detail = restArgs.join(' '); // Todo lo restante como detail

      if (!common) {
        return responderError(bot, mensaje, MESSAGES.FORMATO_INVALIDO);
      }
      if (!detail) {
        return responderError(bot, mensaje, MESSAGES.DETALLE_CORTO);
      }
      if (detail.length < 10) {
        return responderError(bot, mensaje, MESSAGES.DETALLE_CORTO);
      }

      if (!/^[0-9]{4}$/.test(common)) {
        return responderError(bot, mensaje, MESSAGES.COMMON_INVALIDO(common));
      }

      const cliente = await Client.findOne({ common });
      if (!cliente) {
        return responderError(bot, mensaje, MESSAGES.CLIENTE_NO_ENCONTRADO(common));
      }

      const ultimo = await Ticket.findOne().sort({ order: -1 });
      const nuevoOrden = ultimo ? ultimo.order + 1 : 1;

      const lastIncident = await Ticket.findOne().sort({ sequenceNumber: -1 });
      const sequenceNumber = lastIncident ? lastIncident.sequenceNumber + 1 : 1;

      const nuevoTicket = new Ticket({
        clientId: cliente._id,
        userId: usuario._id,
        executiveId: usuario._id,
        type,
        subject,
        detail,
        status: incident_status.PENDING,
        order: nuevoOrden,
        creationDate: new Date(),
        sequenceNumber
      });

      await nuevoTicket.save();

      responderOk(bot, mensaje, `🎫 Ticket creado con ID #${nuevoTicket.sequenceNumber}\n🧾 Asunto: ${subject}`);
    } catch (error) {
      console.error('❌ Error al crear ticket:', error);
      responderError(bot, mensaje, MESSAGES.ERROR_CREAR(error));
    }
  }
};