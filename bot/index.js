const {
  default: makeWASocket,
  DisconnectReason,
  fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');

const fs = require('fs');
const path = require('path');
const qrcode = require('qrcode-terminal');
const pino = require('pino');

const AuthState = require('../models/AuthState'); // Path to model

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

async function iniciarBot(force = false) {
  const { version } = await fetchLatestBaileysVersion();

  // Custom DB auth state
  const auth = {
    creds: {},
    keys: {},
    async get(type, ids) {
      const results = {};
      for (const id of ids) {
        const doc = await AuthState.findOne({ key: `${type}:${id}` });
        results[id] = doc ? doc.value : null;
      }
      return results;
    },
    async set(type, data) {
      for (const [id, value] of Object.entries(data)) {
        await AuthState.updateOne({ key: `${type}:${id}` }, { value }, { upsert: true });
      }
    },
    async clear(type, ids) {
      for (const id of ids) {
        await AuthState.deleteOne({ key: `${type}:${id}` });
      }
    }
  };

  const conectar = () => {
    if (reconnectAttempts >= maxReconnectAttempts) {
      console.error('❌ Max reconexiones alcanzado, stopping retries');
      return;
    }

    sock = makeWASocket({
      version,
      auth,
      logger: pino({ level: 'silent' }),
      printQRInTerminal: false,
      browser: ['Bot Mantis', 'Chrome', '10.0']
    });

    // 🔄 Estado de conexión
    sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
      if (qr) {
        currentQR = qr;
        qrcode.generate(qr, { small: true });
      }

      if (connection === 'close') {
        const code = lastDisconnect?.error?.output?.statusCode;
        console.warn('🔌 Conexión cerrada. Código:', code);

        if (code !== DisconnectReason.loggedOut) {
          reconnectAttempts++;
          const delay = 3000 * Math.pow(2, reconnectAttempts - 1); // Exponential backoff
          console.log('🔁 Reintentando conexión en ' + (delay / 1000) + 's... (intento ' + reconnectAttempts + ')');
          setTimeout(conectar, delay);
        } else {
          console.log('📴 Sesión cerrada. Escaneá el QR para reconectar.');
          reconnectAttempts = 0;
        }
      }

      if (connection === 'open') {
        console.log('✅ Bot conectado a WhatsApp');
        reconnectAttempts = 0;
      }
    });

    // 💾 Guardar credenciales
    sock.ev.on('creds.update', () => {
      // Custom auth handles save
    });

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

      console.log(`📨 Comando: ${comando} | De: ${remitente} (${esGrupo ? 'grupo' : 'contacto'})`);

      const ejecutar = comandos[comando];

      if (ejecutar) {
        try {
          await ejecutar(sock, numero, texto, remitente);
        } catch (err) {
          console.error(`❌ Error ejecutando "${comando}":`, err);
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
    sock.end();
    sock = null;
  }
  conectar();
}

module.exports = {
  iniciarBot,
  getSock: () => sock,
  getCurrentQR: () => currentQR
};