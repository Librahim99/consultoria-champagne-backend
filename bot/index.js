// index.js
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');

const fs = require('fs');
const path = require('path');
const pino = require('pino');

const comandos = {};
const comandosPath = path.join(__dirname, './comandos');

// Variables globales para estado del bot (usadas en endpoints API)
let botStatus = 'disconnected'; // Estado inicial
let currentQr = null; // QR actual si desconectado
let sockGlobal = null; // Referencia al socket para endpoints
let qrAttempts = 0; // Contador de intentos de QR
const maxQrAttempts = 3; // Máximo de intentos

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

// Función de inicialización (async, pero envuelta en promesa)
let conectar; // Declaramos conectar globalmente
let startConnection; // Declaramos startConnection globalmente

async function init() {
  const authFolder = 'auth_info'; // Define la carpeta de auth para fácil limpieza
  const { state, saveCreds } = await useMultiFileAuthState(authFolder);
  const { version } = await fetchLatestBaileysVersion();

  // Definimos conectar (disponible globalmente)
  conectar = () => {
    const sock = makeWASocket({
      version,
      auth: state,
      logger: pino({ level: 'silent' }),
      printQRInTerminal: false,
      browser: ['Bot Mantis', 'Chrome', '10.0']
    });

    sockGlobal = sock; // Asigna el socket global

    // 🔄 Estado de conexión con manejo de Bad MAC y conteo de QR
    sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
      if (qr) {
        qrAttempts++;
        console.log(`🔄 QR generado (intento ${qrAttempts}/${maxQrAttempts})`);
        if (qrAttempts > maxQrAttempts) {
          console.log('❌ Máximo de intentos de QR alcanzado. Deteniendo proceso.');
          currentQr = null;
          qrAttempts = 0;
          sock.end(); // Cierra el socket para detener
          botStatus = 'disconnected';
          return;
        }
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
          qrAttempts = 0; // Reset attempts
          // No reconectar automáticamente, esperar solicitud
        } else if (code !== DisconnectReason.loggedOut) {
          console.log('🔁 Reintentando conexión en 3s...');
          setTimeout(conectar, 3000);
        } else {
          console.log('📴 Sesión cerrada. Esperando solicitud para reconectar.');
          qrAttempts = 0; // Reset attempts
          // No reconectar automáticamente
        }
        botStatus = 'disconnected'; // Actualiza estado en cierre
        currentQr = null; // Limpia QR
      }

      if (connection === 'open') {
        console.log('✅ Bot conectado a WhatsApp');
        botStatus = 'connected'; // Actualiza estado
        currentQr = null; // Limpia QR al conectar
        qrAttempts = 0; // Reset attempts
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

  // Al iniciar, solo conectar si existe creds.json válido en auth_info (sesión activa real)
  const credsPath = path.join(authFolder, 'creds.json');
  if (fs.existsSync(credsPath)) {
    console.log('✅ Sesión existente detectada (creds.json presente). Conectando automáticamente...');
    conectar();
  } else {
    console.log('📴 No hay sesión activa válida. Esperando solicitud para iniciar conexión.');
  }
}

// Ejecutamos init como promesa (para manejar async)
const initPromise = init();

// Función exportada para iniciar conexión manualmente (async para awaiting init)
startConnection = async () => {
  await initPromise; // Espera a que la inicialización async termine si no lo ha hecho
  qrAttempts = 0; // Reset attempts al solicitar
  conectar();
};

// Exportamos directamente (sin wrapper)
module.exports = { 
  getBotStatus: () => botStatus, 
  getCurrentQr: () => currentQr, 
  getSockGlobal: () => sockGlobal,
  startConnection
};