const Incident = require('../../models/Incident');

module.exports = async (sock, numero, texto) => {
  const [, id, ...mensajeArr] = texto.trim().split(' ');
  const respuesta = mensajeArr.join(' ').trim();

  if (!id || !respuesta) {
    return sock.sendMessage(numero, {
      text: '❌ Usá el comando así:\n`!responder <ID_ticket> <mensaje>`'
    });
  }

  try {
    const ticket = await Incident.findById(id);
    if (!ticket) {
      return sock.sendMessage(numero, {
        text: `🚫 No se encontró ningún ticket con ID *${id}*.`
      });
    }

    const fecha = new Date().toLocaleString();
    const linea = `\n🗒️ *${fecha}* – Respuesta interna:\n${respuesta}`;

    ticket.observation = (ticket.observation || '') + linea;
    await ticket.save();

    await sock.sendMessage(numero, {
      text: `📨 Tu respuesta fue registrada en el ticket *${id}* correctamente.`
    });

  } catch (err) {
    console.error('❌ Error en !responder:', err);
    return sock.sendMessage(numero, {
      text: '🚨 Ocurrió un error al guardar la respuesta. Intentá más tarde.'
    });
  }
};
