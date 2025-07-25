const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');

const fs = require('fs');
const path = require('path');
const qrcode = require('qrcode-terminal');
const pino = require('pino');

const comandos = {};
const comandosPath = path.join(__dirname, './comandos');

// 🚀 Cargar todos los comandos dinámicamente
fs.readdirSync(comandosPath)
  .filter(file => file.endsWith('.js'))
  .forEach(file => {
    const nombre = file.replace('.js', '');
    comandos[`!${nombre}`] = require(path.join(comandosPath, file));
    console.log(`✅ Comando cargado: !${nombre}`);
  });

// Alias personalizados
comandos['!ayuda'] = comandos['!menu'];
comandos['!inicio'] = comandos['!menu'];

let sock = null;
let currentQR = null;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;
const logger = pino({ level: 'info' }); // Para logs detallados

async function iniciarBot(force = false) {
  const { state, saveCreds } = await useMultiFileAuthState('custom DB');
  const { version } = await fetchLatestBaileysVersion();

  const conectar = () => {
    if (reconnectAttempts >= maxReconnectAttempts) {
      logger.error('Máximo reconexiones alcanzado');
      return;
    }

    sock = makeWASocket({
      version,
      auth: state,
      logger,
      printQRInTerminal: false,
      browser: ['Bot Mantis', 'Chrome', '10.0']
    });

    // 🔄 Estado de conexión
    sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
      if (qr) {
        currentQR = qr;
        logger.info('QR generado');
        qrcode.generate(qr, { small: true }); // Siempre en local for test
      }

      if (connection === 'close') {
        const code = lastDisconnect?.error?.output?.statusCode;
        logger.warn('Conexión cerrada. Código:', code);

        if (code !== DisconnectReason.loggedOut) {
          reconnectAttempts++;
          const delay = Math.min(reconnectAttempts * 3000, 30000); // Backoff
          logger.info('Reintentando conexión en ' + delay/1000 + 's...');
          setTimeout(conectar, delay);
        } else {
          logger.info('Sesión cerrada. Escaneá el QR para reconectar.');
          reconnectAttempts = 0;
        }
      }

      if (connection === 'open') {
        logger.info('✅ Bot conectado a WhatsApp');
      }
    });

    // 💾 Guardar credenciales
    sock.ev.on('creds.update', saveCreds);

    // 💬 Manejo de mensajes
    sock.ev.on('messages.upsert', async ({ messages }) => {
      const mensaje = messages?.[0];
      if (!mensaje?.message || mensaje.key.fromMe) return;

      const texto =
        mensaje.message.conversation ||
        mensaje.message.extendedTextMessage?.text ||
        '';

      if (!texto.startsWith('!')) return;

      const comando = texto.split(' ')[0].toLowerCase();
      const numero = mensaje.key.remoteJid;
      const esGrupo = numero.endsWith('@g.us');
      const remitente = esGrupo ? mensaje.key.participant : numero;

      logger.info(`📨 Comando: ${comando} | De: ${remitente} (${esGrupo ? 'grupo' : 'contacto'})`);

      const ejecutar = comandos[comando];

      if (ejecutar) {
        try {
          await ejecutar(sock, numero, texto, remitente);
        } catch (err) {
          logger.error(`❌ Error ejecutando "${comando}":`, err);
          await sock.sendMessage(numero, {
            text: '🚨 Error al ejecutar el comando. Revisá la sintaxis o intentá más tarde.'
          });
        }
      } else {
        await sock.sendMessage(numero, {
          text: '❓ Comando no reconocido. Usá `!menu` para ver las opciones disponibles.'
        });
      }
    });
  };

  if (force && sock) {
    logger.info('Force reconnect: closing current socket');
    sock.end();
    sock = null;
    reconnectAttempts = 0;
  }
  conectar();
}

module.exports = {
  iniciarBot,
  getSock: () => sock,
  getCurrentQR: () => currentQR
};