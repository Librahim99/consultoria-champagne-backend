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

// Variables globales para estado del bot (usadas en endpoints API)
let botStatus = 'disconnected'; // Estado inicial
let currentQr = null; // QR actual si desconectado
let sockGlobal = null; // Referencia al socket para endpoints

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
  const authFolder = 'auth_info'; // Define la carpeta de auth para fácil limpieza
  const { state, saveCreds } = await useMultiFileAuthState(authFolder);
  const { version } = await fetchLatestBaileysVersion();

  const conectar = () => {
    const sock = makeWASocket({
      version,
      auth: state,
      logger: pino({ level: 'silent' }),
      printQRInTerminal: false,
      browser: ['Bot Mantis', 'Chrome', '10.0']
    });

    sockGlobal = sock; // Asigna el socket global

    // 🔄 Estado de conexión con manejo de Bad MAC
    sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
      if (qr) {
        qrcode.generate(qr, { small: true });
        currentQr = qr; // Actualiza QR global
        botStatus = 'disconnected'; // Actualiza estado
      }

      if (connection === 'close') {
        const code = lastDisconnect?.error?.output?.statusCode;
        const errorMsg = lastDisconnect?.error?.toString() || '';
        console.warn('🔌 Conexión cerrada. Código:', code);

        if (errorMsg.includes('Bad MAC')) {
          console.log('❌ Sesión corrupta detectada (Bad MAC). Limpiando y reconectando...');
          fs.rmSync(authFolder, { recursive: true, force: true }); // Limpia sesión corrupta
          conectar(); // Reconecta inmediatamente
        } else if (code !== DisconnectReason.loggedOut) {
          console.log('🔁 Reintentando conexión en 3s...');
          setTimeout(conectar, 3000);
        } else {
          console.log('📴 Sesión cerrada. Escaneá el QR para reconectar.');
          conectar(); // Reconecta automáticamente después de logout para generar QR nuevo
        }
        botStatus = 'disconnected'; // Actualiza estado en cierre
        currentQr = null; // Limpia QR
      }

      if (connection === 'open') {
        console.log('✅ Bot conectado a WhatsApp');
        botStatus = 'connected'; // Actualiza estado
        currentQr = null; // Limpia QR al conectar
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

module.exports = { iniciarBot, getBotStatus: () => botStatus, getCurrentQr: () => currentQr, getSockGlobal: () => sockGlobal };