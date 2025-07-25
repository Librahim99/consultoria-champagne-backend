const path = require('path');
const fs = require('fs');
const { model } = require('../../../utils/model.js');
const User = model('User');

const { responderError, responderAyuda, MESSAGES } = require('../../../utils/respuestas');

module.exports = async (sock, numero, texto) => {
  const args = texto.trim().split(' ');
  const subcomando = args[1]?.toLowerCase();

  if (!args[1]) {
    return responderAyuda(sock, { key: { remoteJid: numero } }, MESSAGES.AYUDA_TICKETS);
  }

  try {
    // Buscar usuario por teléfono
    const telefono = numero.split('@')[0];
    const username = 'Consultor-IA'
    const usuario = await User.findOne({ username });

    if (!usuario) {
      return responderError(sock, { key: { remoteJid: numero } }, MESSAGES.NO_REGISTRADO);
    }

    // Subcomando como archivo individual
    const comandoPath = path.join(__dirname, `${subcomando}.js`);
    if (fs.existsSync(comandoPath)) {
      const ejecutarComando = require(comandoPath);
      return await ejecutarComando(sock, { key: { remoteJid: numero, fromMe: false, id: 'fake-' + Date.now() }, message: { conversation: texto } }, args.slice(2), usuario);
    }

    // Interpretar como creación rápida
    const detalle = args.slice(1).join(' ');
    if (!detalle) {
      return responderError(sock, { key: { remoteJid: numero } }, '❌ Detalle faltante (requerido para creación rápida). Usa !ticket <detalle> con mínimo 10 caracteres o !ticket crear <common> <detalle>.');
    }
    if (detalle.length < 10) {
      return responderError(sock, { key: { remoteJid: numero } }, '❌ Detalle demasiado corto (mínimo 10 caracteres requeridos para evitar tickets vacíos). Corrige con detalle más largo y reintenta.');
    }

    const crearTicket = require('./crear.js');
    const defaultCommon = null; // Fuerza uso de comando completo si no hay default
    const defaultTipo = incident_types.TICKET;
    const defaultAsunto = 'Ticket';

    if (defaultCommon === null) {
      return responderError(sock, { key: { remoteJid: numero } }, MESSAGES.CREACION_RAPIDA_REQUIERE_CLIENTE);
    }

    return await crearTicket(sock, { key: { remoteJid: numero, fromMe: false, id: 'fake-' + Date.now() }, message: { conversation: texto } }, [defaultCommon, defaultTipo, defaultAsunto, detalle], usuario);

  } catch (err) {
    console.error(`❌ Error en comando !ticket:`, err);
    return responderError(sock, { key: { remoteJid: numero } }, MESSAGES.ERROR_PROCESANDO(err));
  }
};