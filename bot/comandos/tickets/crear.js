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

module.exports = async (bot, mensaje, args, usuario) => {
  try {
    if (!rolesPermitidos.includes(usuario.rank)) {
      return responderError(bot, mensaje, MESSAGES.NO_PERMISOS(usuario.rank));
    }

    const [common, ...restArgs] = args;
    let type = incident_types.TICKET; // Default
    let subject = 'Ticket'; // Default fijo
    let detail = restArgs.join(' '); // Todo lo restante como detail

    if (!common) {
      return responderError(bot, mensaje, '❌ Formato inválido (falta common: 4 dígitos requeridos). Corrige con common válido y reintenta.');
    }
    if (!detail) {
      return responderError(bot, mensaje, '❌ Formato inválido (falta detalle: mínimo 10 chars requeridos). Corrige con detalle y reintenta.');
    }
    if (detail.length < 10) {
      return responderError(bot, mensaje, '❌ Detalle demasiado corto (mínimo 10 caracteres requeridos). Corrige con detalle más largo y reintenta.');
    }

    if (!/^[0-9]{4}$/.test(common)) {
      return responderError(bot, mensaje, MESSAGES.COMMON_INVALIDO(common));
    }

    const cliente = await Client.findOne({ common });
    if (!cliente) return responderError(bot, mensaje, MESSAGES.CLIENTE_NO_ENCONTRADO(common));

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
};