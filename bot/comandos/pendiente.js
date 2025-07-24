const Pending = require('../../models/Pending');

module.exports = async (sock, numero, texto) => {
  const contenido = texto.split(' ').slice(1).join(' ');
  const partes = contenido.split(';').map(p => p.trim());

  const [clientId, userId, detail, status, observation = '', incidentId = null] = partes;

  const estadosPermitidos = [
    'pendiente', 'en progreso', 'completado', 'cancelado', 'revisión'
  ];

  // 🧪 Validación de campos requeridos
  if (!clientId || !userId || !detail || !status) {
    return sock.sendMessage(numero, {
      text: `❌ *Faltan datos obligatorios.*\n\n📌 Usá:\n\`!pendiente <clientId>;<userId>;<detalle>;<estado>;<observación opcional>;<incidentId opcional>\``
    });
  }

  if (!estadosPermitidos.includes(status)) {
    return sock.sendMessage(numero, {
      text: `⚠️ *Estado no válido.*\n\n📋 Estados permitidos:\n${estadosPermitidos.map(e => `- \`${e}\``).join('\n')}`
    });
  }

  try {
    const nuevoPendiente = new Pending({
      clientId,
      userId,
      detail,
      status,
      observation: observation || undefined,
      incidentId: incidentId || undefined,
      date: new Date()
    });

    await nuevoPendiente.save();

    const mensaje = `📌 *Tarea pendiente registrada exitosamente*

🧾 *Cliente ID:* ${clientId}
👤 *Usuario ID:* ${userId}
📅 *Fecha:* ${nuevoPendiente.date.toLocaleString()}
📋 *Estado:* *${status}*
📝 *Detalle:* ${detail}
💬 *Observación:* ${observation || 'Sin observación'}
📎 *Incidente relacionado:* ${incidentId || 'No vinculado'}`;

    return sock.sendMessage(numero, { text: mensaje });

  } catch (err) {
    console.error('❌ Error al guardar pendiente:', err);
    return sock.sendMessage(numero, {
      text: '🚨 Ocurrió un error interno al registrar la tarea. Intentá más tarde.'
    });
  }
};
