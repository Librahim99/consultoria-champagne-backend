module.exports = {
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

