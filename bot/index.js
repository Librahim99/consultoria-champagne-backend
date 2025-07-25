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

async function iniciarBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info');
  const { version } = await fetchLatestBaileysVersion();

  const conectar = () => {
    const sock = makeWASocket({
      version,
      auth: state,
      logger: pino({ level: 'silent' }),
      printQRInTerminal: false,
      browser: ['Bot Mantis', 'Chrome', '10.0']
    });

    // 🔄 Estado de conexión
    sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
      if (qr) qrcode.generate(qr, { small: true });

      if (connection === 'close') {
        const code = lastDisconnect?.error?.output?.statusCode;
        console.warn('🔌 Conexión cerrada. Código:', code);

        if (code !== DisconnectReason.loggedOut) {
          console.log('🔁 Reintentando conexión en 3s...');
          setTimeout(conectar, 3000); // retry limpio
        } else {
          console.log('📴 Sesión cerrada. Escaneá el QR para reconectar.');
        }
      }

      if (connection === 'open') {
        console.log('✅ Bot conectado a WhatsApp');
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

  conectar();
}

module.exports = iniciarBot;
