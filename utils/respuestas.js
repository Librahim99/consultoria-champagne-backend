module.exports = {
  MESSAGES: {
    NO_REGISTRADO: '⛔ No estás registrado como usuario autorizado para usar tickets. Contacta admin para registro.',
    DETALLE_CORTO: '❌ Detalle inválido (falta o demasiado corto, mínimo 10 caracteres requeridos). Corrige con detalle más largo y reintenta.',
    CREACION_RAPIDA_REQUIERE_CLIENTE: '❌ Creación rápida requiere cliente asociado. Usa !ticket crear <common> <detalle> para especificar.',
    ERROR_PROCESANDO: error => '🚨 Error procesando el comando (detalle específico: ' + error.message + '). Revisá logs o contacta soporte para resolver.',
    AYUDA_TICKETS: '🎫 *Panel de Gestión de Tickets - Interactivo*\n\n1️⃣ *Crear:* !ticket crear <common> <detalle> (tipo/asunto por default)\n2️⃣ *Estado:* !ticket estado <id> <nuevo_estado>\n3️⃣ *Asignar:* !ticket asignar <id> <usuario>\n4️⃣ *Cerrar:* !ticket cerrar <id>\n5️⃣ *Eliminar:* !ticket borrar <id>\n6️⃣ *Listar:* !ticket listar estado <estado>\n7️⃣ *Listar:* !ticket listar fecha <YYYY-MM-DD,YYYY-MM-DD>\n\n💡 _También podés crear un ticket directo:_  \n`!ticket No puedo imprimir desde Chrome` (requiere cliente asociado, mínimo 10 chars)\n⚠️ Todos los tickets requieren un cliente (common de 4 dígitos).',
    NO_PERMISOS: rank => '⛔ No tenés permisos para crear tickets (tu rank actual: ' + rank + '). Contactá admin para obtener acceso.',
    FORMATO_INVALIDO: '❌ Formato inválido (falta dato requerido). Mínimo: !ticket crear <common> <detalle>\nEjemplo: !ticket crear 0007 "error en impresión de despachos"\n(Opcional: !ticket crear <common> <tipo> <detalle>)',
    COMMON_INVALIDO: common => '❌ Common inválido: "' + common + '" (debe ser exactamente 4 dígitos numéricos, ej. 0007). Corrige el common y reintenta.',
    CLIENTE_NO_ENCONTRADO: common => '❌ Cliente no encontrado por common "' + common + '" (verifica si el código existe o corrige). No se puede crear ticket sin cliente válido.',
    ERROR_CREAR: error => '❌ Error al crear ticket (detalle: ' + error.message + '). Verifica inputs como common válido o detalle largo (min 10 chars), y contacta soporte si persiste.'
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
    const jid = mensaje?.key?.remoteJid || mensaje?.remoteJid || mensaje;
    
    if (!jid || typeof jid !== 'string') {
      console.error('❌ No se puede enviar mensaje. remoteJid inválido.');
      console.error('Mensaje recibido:', mensaje);
      return;
    }

    const options = {};
    if (mensaje?.key?.remoteJid) {
      options.quoted = mensaje;
    }

    await bot.sendMessage(jid, { text: texto }, options);
  } catch (err) {
    console.error('❌ Error al enviar mensaje:', err);
  }
}