// bot/index.js
const fs = require('fs');
const path = require('path');
const { Boom } = require('@hapi/boom');
const {
  default: makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
} = require('@whiskeysockets/baileys');
const pino = require('pino');

const sessionPath = path.join(__dirname, 'session');

// Limpieza segura de sesión (para el logout)
global.clearSession = () => {
  if (fs.existsSync(sessionPath)) {
    fs.rmSync(sessionPath, { recursive: true, force: true });
    console.log('🗑️ Sesión borrada completamente');
  }
};

async function startBot() {
  const { version } = await fetchLatestBaileysVersion();
  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false, // El QR lo manejamos por endpoint
    logger: pino({ level: 'silent' }),
    browser: ['Consultoría Champagne', 'Chrome', '124.0'],
    syncFullHistory: false,
    connectTimeoutMs: 60_000,
    defaultQueryTimeoutMs: 60_000,
    keepAliveIntervalMs: 30_000, // evita que se duerma
    generateHighQualityLinkPreview: true,
  });

  // Guardamos el sock global para usarlo en rutas
  global.sock = sock;

  // === MANEJO DE CONEXIÓN (ESTO ES LO QUE FALTABA) ===
  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('📱 Nuevo QR generado');
      // Emitimos el QR al frontend (lo manejamos en adminbot.js)
      if (global.io) {
        global.io.emit('qr', qr);
      }
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut; // 401

      console.log('Conexión cerrada:', statusCode || 'desconocido');

      if (statusCode === DisconnectReason.loggedOut) {
        console.log('❌ Logout manual detectado → no se reconecta');
        global.clearSession();
      } else if (shouldReconnect) {
        console.log('🔄 Reconectando en 5 segundos...');
        setTimeout(startBot, 5000);
      }
    } else if (connection === 'open') {
      console.log('✅ Bot conectado a WhatsApp');
      if (global.io) {
        global.io.emit('connected', true);
      }
    }
  });

  // Guardar credenciales
  sock.ev.on('creds.update', saveCreds);

  // Manejo de errores para que no explote el proceso
  sock.ev.on('error', (err) => {
    console.error('Error en Baileys:', err.message || err);
  });

  // Opcional: evento cuando se pierde conexión temporal
  sock.ev.on('connecting', () => {
    console.log('⏳ Conectando a WhatsApp...');
  });
}

// Iniciamos el bot
startBot().catch((err) => {
  console.error('Error al iniciar el bot:', err);
  process.exit(1);
});

module.exports = { startBot };