const Incident = require('../../models/Incident');
const User = require('../../models/User');

module.exports = async (sock, numero, texto) => {
  const [, username] = texto.trim().split(' ');

  if (!username) {
    return sock.sendMessage(numero, {
      text: '❌ Formato incorrecto. Usá: `!mis-tickets <usuario>`'
    });
  }

  try {
    const user = await User.findOne({ username });
    if (!user) {
      return sock.sendMessage(numero, {
        text: `🚫 El usuario *${username}* no existe.`
      });
    }

    const tickets = await Incident.find({ assignedUserId: user._id }).sort({ creationDate: -1 });

    if (!tickets.length) {
      return sock.sendMessage(numero, {
        text: `📭 No hay tickets asignados a *${username}*.`
      });
    }

    let mensaje = `🎟️ *Tickets asignados a ${username}:*\n━━━━━━━━━━━━━━━━━━━━\n`;
    tickets.forEach((t, i) => {
      mensaje += `
${i + 1}. 🆔 *#${t.sequenceNumber || t._id.toString().slice(-6)}*
📅 ${new Date(t.creationDate).toLocaleDateString()}
📌 Estado: *${t.status}*
📝 ${t.subject || t.detail?.slice(0, 60) || 'Sin detalle'}
`;
    });

    mensaje += `\n📊 Total: *${tickets.length}* tickets`;

    await sock.sendMessage(numero, { text: mensaje.trim() });

  } catch (err) {
    console.error('❌ Error en !mis-tickets:', err);
    await sock.sendMessage(numero, {
      text: '🚨 Error al obtener los tickets. Intentá más tarde.'
    });
  }
};
