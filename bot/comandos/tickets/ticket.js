const path = require('path');
const fs = require('fs');
const { model } = require('../../../utils/model.js');
const User = model('User');

const { responderError, responderAyuda, MESSAGES } = require('../../../utils/respuestas');

module.exports = async (sock, numero, texto) => {
  const args = texto.trim().split(' ');
  const subcomando = args[1]?.toLowerCase();

  if (!args[1]) {
    return responderAyuda(sock, { key: { remoteJid: numero, fromMe: false, id: `fake-${Date.now()}` }, message: { conversation: texto } }, MESSAGES.AYUDA_TICKETS);
  }

  try {
    // Buscar usuario por teléfono
    const telefono = numero.split('@')[0];
    const username = 'Consultor-IA';
    const usuario = await User.findOne({ username });

    if (!usuario) {
      return responderError(sock, { key: { remoteJid: numero, fromMe: false, id: `fake-${Date.now()}` }, message: { conversation: texto } }, MESSAGES.NO_REGISTRADO);
    }

    // Subcomando como archivo individual
    const comandoPath = path.join(__dirname, `${subcomando}.js`);
    if (fs.existsSync(comandoPath)) {
      const comandoModule = require(comandoPath);
      if (typeof comandoModule.ejecutar !== 'function') {
        throw new Error(`El subcomando ${subcomando} no exporta una función 'ejecutar' válida.`);
      }
      return await comandoModule.ejecutar({
        bot: sock,
        mensaje: { key: { remoteJid: numero, fromMe: false, id: `fake-${Date.now()}` }, message: { conversation: texto } },
        argumentos: args.slice(2),
        usuario
      });
    }

    // Interpretar como creación rápida
    const detalle = args.slice(1).join(' ');
    if (!detalle) {
      return responderError(sock, { key: { remoteJid: numero, fromMe: false, id: `fake-${Date.now()}` }, message: { conversation: texto } }, MESSAGES.FORMATO_INCORRECTO);
    }
    if (detalle.length < 10) {
      return responderError(sock, { key: { remoteJid: numero, fromMe: false, id: `fake-${Date.now()}` }, message: { conversation: texto } }, MESSAGES.DETALLE_CORTO);
    }

    const crearTicketModule = require('./crear.js');
    const defaultCommon = null; // Fuerza uso de comando completo si no hay default
    const defaultTipo = 'TICKET'; // Asumiendo que incident_types.TICKET es 'TICKET'
    const defaultAsunto = 'Ticket';

    if (defaultCommon === null) {
      return responderError(sock, { key: { remoteJid: numero, fromMe: false, id: `fake-${Date.now()}` }, message: { conversation: texto } }, MESSAGES.CREACION_RAPIDA_REQUIERE_CLIENTE);
    }

    return await crearTicketModule.ejecutar({
      bot: sock,
      mensaje: { key: { remoteJid: numero, fromMe: false, id: `fake-${Date.now()}` }, message: { conversation: texto } },
      argumentos: [defaultCommon, detalle], // Ajustado para creación rápida: common + detalle
      usuario
    });

  } catch (err) {
    console.error(`❌ Error en comando !ticket:`, err);
    return responderError(sock, { key: { remoteJid: numero, fromMe: false, id: `fake-${Date.now()}` }, message: { conversation: texto } }, MESSAGES.ERROR_PROCESANDO(err));
  }
};