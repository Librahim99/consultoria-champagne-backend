const { model } = require('../../../utils/model'); // <- fix acá

const Ticket = model('Incident');
const Client = model('Client');
const User = model('User');

const { incident_types, incident_status, ranks } = require('../../../utils/enums');
const { responderError, responderOk } = require('../../../utils/respuestas');

const rolesPermitidos = [
  ranks.TOTALACCESS,
  ranks.CONSULTOR,
  ranks.CONSULTORCHIEF,
  ranks.DEV,
  ranks.DEVCHIEF
];

module.exports = async (bot, mensaje, args, usuario) => {
  try {
    if (!rolesPermitidos.includes(usuario.rank)) {
      return responderError(bot, mensaje, '⛔ No tenés permisos para crear tickets.');
    }

    const [clientId, type, subject, ...detalleArr] = args;
    const detail = detalleArr.join(' ');

    if (!clientId || !type || !subject || !detail) {
      return responderError(bot, mensaje, '❌ Formato inválido. Usá:\n!crear <clientId> <tipo> <asunto> <detalle>');
    }

    if (!Object.values(incident_types).includes(type)) {
      return responderError(bot, mensaje, '❌ Tipo de ticket inválido. Tipos válidos:\n' + Object.values(incident_types).join(', '));
    }

    const cliente = await Client.findById(clientId);
    if (!cliente) return responderError(bot, mensaje, '❌ Cliente no encontrado.');

    const ultimo = await Ticket.findOne().sort({ order: -1 });
    const nuevoOrden = ultimo ? ultimo.order + 1 : 1;

    const nuevoTicket = new Ticket({
      clientId,
      userId: usuario._id,
      executiveId: usuario._id,
      type,
      subject,
      detail,
      status: incident_status.PENDING,
      order: nuevoOrden,
      creationDate: new Date()
    });

    await nuevoTicket.save();

    responderOk(bot, mensaje, `🎫 Ticket creado con ID #${nuevoTicket.sequenceNumber}\n🧾 Asunto: ${subject}`);
  } catch (error) {
    console.error('❌ Error al crear ticket:', error);
    responderError(bot, mensaje, 'Ocurrió un error al crear el ticket. Contactá a soporte.');
  }
};
