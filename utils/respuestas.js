module.exports = {
  MESSAGES: {
    NO_REGISTRADO: '⛔ No estás registrado como usuario autorizado para usar tickets. Contacta admin para registro.',
    DETALLE_CORTO: '❌ Detalle inválido (falta o demasiado corto, mínimo 10 caracteres requeridos). Corrige con detalle más largo y reintenta.',
    CREACION_RAPIDA_REQUIERE_CLIENTE: '❌ Creación rápida requiere cliente asociado. Usa !ticket crear <common> <detalle> para especificar.',
    ERROR_PROCESANDO: error => '🚨 Error procesando el comando (detalle específico: ' + error.message + '). Revisá logs o contacta soporte para resolver.',
    AYUDA_TICKETS: '🎫 *Panel de Gestión de Tickets - Interactivo*\n\n1️⃣ *Crear:* !ticket crear <common> <detalle> (tipo/asunto por default)\n2️⃣ *Estado:* !ticket estado <id> <nuevo_estado>\n3️⃣ *Asignar:* !ticket asignar <id> <usuario>\n4️⃣ *Cerrar:* !ticket cerrar <id>\n5️⃣ *Eliminar:* !ticket borrar <id>\n6️⃣ *Listar:* !ticket listar estado <estado>\n7️⃣ *Listar:* !ticket listar fecha <YYYY-MM-DD,YYYY-MM-DD>\n\n💡 _También podés crear un ticket directo:_  \n`!ticket No puedo imprimir desde Chrome` (requiere cliente asociado, mínimo 10 chars)\n⚠️ Todos los tickets requieren un cliente (common de 4 dígitos).',
    NO_PERMISOS: rank => '⛔ No tenés permisos para esta acción (tu rank actual: ' + rank + '). Contactá admin para obtener acceso.',
    FORMATO_INVALIDO: '❌ Formato inválido (falta dato requerido). Mínimo: !ticket crear <número de común> <detalle>\nEjemplo: !ticket crear 0007 "error en impresión de despachos"',
    FORMATO_INCORRECTO: '❌ Formato incorrecto. Usa !ticket <subcomando> o !ticket <detalle> (mínimo 10 caracteres). Ejemplo: !ticket No puedo imprimir desde Chrome',
    COMMON_INVALIDO: common => '❌ Common inválido: "' + common + '" (debe ser exactamente 4 dígitos numéricos, ej. 0007). Corrige el common y reintenta.',
    CLIENTE_NO_ENCONTRADO: common => '❌ Cliente no encontrado por common "' + common + '" (verifica si el código existe o corrige). No se puede crear ticket sin cliente válido.',
    ERROR_CREAR: error => '❌ Error al crear ticket (detalle: ' + error.message + '). Verifica inputs como common válido o detalle largo (min 10 chars), y contacta soporte si persiste.',
    // Nuevos mensajes para asignar.js
    FORMATO_ASIGNAR_INVALIDO: '⚠️ Formato inválido. Usá: !asignar <nro_ticket> <usuario>',
    TICKET_NO_ENCONTRADO: nroTicket => `🚫 No se encontró el ticket N°${nroTicket}`,
    USUARIO_NO_REGISTRADO: '🚫 El usuario mencionado no está registrado en el sistema.',
    TICKET_ASIGNADO: (nroTicket, username) => `📌 Ticket N°${nroTicket} asignado a ${username}`,
    ERROR_ASIGNAR: '🚨 Ocurrió un error al asignar el ticket.',
    // Nuevos mensajes para borrar.js
    FORMATO_BORRAR_INVALIDO: '⚠️ Debés especificar el número del ticket. Ej: !borrar 1234',
    TICKET_BORRADO: nroTicket => `🗑️ Ticket N°${nroTicket} eliminado permanentemente.`,
    ERROR_BORRAR: '🚨 Ocurrió un error al intentar eliminar el ticket.',
    // Nuevos mensajes para cerrar.js
    FORMATO_CERRAR_INVALIDO: '❗ Formato inválido. Usá: !cerrar <nro_ticket> <detalle>',
    TICKET_YA_CERRADO: nroTicket => `ℹ️ El ticket N°${nroTicket} ya está cerrado.`,
    TICKET_CERRADO: nroTicket => `✅ Ticket N°${nroTicket} cerrado correctamente.`,
    ERROR_CERRAR: '🚨 Ocurrió un error al cerrar el ticket.',
    // Nuevos mensajes para estado.js
    FORMATO_ESTADO_INVALIDO: '⚠️ Uso correcto: !estado <nro_ticket> <nuevo_estado>',
    ESTADO_INVALIDO: estados => `❌ Estado inválido. Usá uno de: ${estados}`,
    ESTADO_ACTUALIZADO: (nroTicket, anterior, nuevo) => `📌 Estado del ticket N°${nroTicket} actualizado:\n*${anterior} ➜ ${nuevo}*`,
    ERROR_ESTADO: '🚨 Ocurrió un error al cambiar el estado del ticket.',
    // Nuevos mensajes para listar.js
    FORMATO_LISTAR_INVALIDO: `📋 Usá una de estas opciones:\n- \`!ticket listar estado pendiente\`\n- \`!ticket listar fecha 2024-07-01,2024-07-23\`\n- Agregá \`exportar\` al final para generar el CSV`,
    ESTADO_LISTAR_INVALIDO: estados => `❌ Estado inválido. Usá uno de:\n${estados}`,
    FECHAS_INVALIDAS: '❌ Fechas inválidas. Usá formato: YYYY-MM-DD',
    SIN_TICKETS: '📭 No se encontraron tickets con ese filtro.',
    LISTADO_TICKETS: listado => `📋 *Listado de Tickets filtrados:*\n\n${listado}`,
    ERROR_LISTAR: '🚨 Hubo un error procesando el listado. Intentá más tarde.'
  },
  responderOk: async (bot, mensaje, texto) => {
    await enviarMensajeSeguro(bot, mensaje, `✅ ${texto}`);
  },

  responderError: async (bot, mensaje, texto) => {
    await enviarMensajeSeguro(bot, mensaje, `❌ ${texto}`);
  },

  responderInfo: async (bot, mensaje, texto) => {
    await enviarMensajeSeguro(bot, mensaje, `ℹ️ ${texto}`);
  },

  responderAdvertencia: async (bot, mensaje, texto) => {
    await enviarMensajeSeguro(bot, mensaje, `⚠️ ${texto}`);
  },

  responderAyuda: async (bot, mensaje, texto) => {
    await enviarMensajeSeguro(bot, mensaje, `ℹ️ ${texto}`);
  }
};

async function enviarMensajeSeguro(bot, mensaje, texto) {
  try {
    // Validar que bot esté definido
    if (!bot) {
      console.error('❌ No se puede enviar mensaje. Bot no está definido.');
      return;
    }

    // Obtener el JID de manera segura
    const jid = mensaje?.key?.remoteJid || mensaje?.remoteJid || (typeof mensaje === 'string' ? mensaje : null);
    
    if (!jid || typeof jid !== 'string') {
      console.error('❌ No se puede enviar mensaje. remoteJid inválido.');
      console.error('Mensaje recibido:', JSON.stringify(mensaje, null, 2));
      return;
    }

    // Construir opciones solo si quoted es válido
    const options = {};
    if (mensaje?.key?.remoteJid && mensaje?.message) {
      options.quoted = mensaje;
    }

    await bot.sendMessage(jid, { text: texto }, options);
    console.log(`✅ Mensaje enviado a ${jid}`);
  } catch (err) {
    console.error('❌ Error al enviar mensaje:', err);
  }
}