// index.js
const {
  default: makeWASocket,
  DisconnectReason,
  fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');



const fs = require('fs');
const path = require('path');
const pino = require('pino');
const dotenv = require('dotenv');
dotenv.config({ quiet: true });


// Importamos el modelo para limpieza y listados
const AuthState = require('../models/AuthState');

const comandos = {};
const comandosPath = path.join(__dirname, './comandos');

// Importamos mongoAuthState
const useMongoAuthState = require('./servicios/mongoAuthState');

// Variables globales para estado del bot (usadas en endpoints API)
let botStatus = 'disconnected'; // Estado inicial
let currentQr = null; // QR actual si desconectado
let sockGlobal = null; // Referencia al socket para endpoints
let qrAttempts = 0; // Contador de intentos de QR
const maxQrAttempts = 3; // Máximo de intentos
let reconnectAttempts = 0; // Contador de reintentos
const maxReconnectAttempts = 3; // Límite de reintentos
let reconnectDelay = 3000; // Delay inicial

// Sesión fija desde env
const sessionId = process.env.SESSION_ID || 'default';
console.log(`🆔 Usando sesión fija: ${sessionId}`);

// Variables para state y saveCreds
let currentState = null;
let currentSaveCreds = null;

// 🚀 Cargar todos los comandos dinámicamente
fs.readdirSync(comandosPath)
  .filter(file => file.endsWith('.js'))
  .forEach(file => {
    const nombre = file.replace('.js', '');
    comandos[`!${nombre}`] = require(path.join(comandosPath, file));
  });
  console.log(`✅ Comandos cargados!`);

// Alias personalizados
comandos['!ayuda'] = comandos['!menu'];
comandos['!inicio'] = comandos['!menu'];

// Función conectar definida globalmente
let conectar = null;

// Función de inicialización (async)
async function init() {
  const { state, saveCreds } = await useMongoAuthState(sessionId);
  currentState = state;
  currentSaveCreds = saveCreds;

  const { version } = await fetchLatestBaileysVersion();

  conectar = () => {
    if (!currentState) {
      console.error('❌ Estado de autenticación no inicializado. Reiniciando sesión...');
      return;
    }

    const sock = makeWASocket({
      version,
      auth: currentState,
      logger: pino({ level: 'silent' }),
      printQRInTerminal: false,
      browser: ['Bot Mantis', 'Chrome', '10.0'],
      connectTimeoutMs: 60_000,
  defaultQueryTimeoutMs: 60_000,
  keepAliveIntervalMs: 20_000,
    });

    sockGlobal = sock;

    sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
      if (qr) {
        qrAttempts++;
        console.log(`🔄 QR generado (intento ${qrAttempts}/${maxQrAttempts}) para sesión ${sessionId}`);
        if (qrAttempts > maxQrAttempts) {
          console.log('❌ Máximo de intentos de QR alcanzado. Deteniendo proceso.');
          currentQr = null;
          qrAttempts = 0;
          sock.end();
          botStatus = 'disconnected';
          return;
        }
        currentQr = qr;
        botStatus = 'disconnected';
      }

      if (connection === 'close') {
        const code = lastDisconnect?.error?.output?.statusCode;
        const errorMsg = lastDisconnect?.error?.toString() || '';
        console.warn('🔌 Conexión cerrada. Código:', code);

        reconnectAttempts++;
        if (reconnectAttempts > maxReconnectAttempts) {
          console.error(`❌ Máximo de reintentos (${maxReconnectAttempts}) alcanzado para ${sessionId}. Reiniciando sesión...`);
          await AuthState.deleteMany({ sessionId });
          reconnectAttempts = 0;
          qrAttempts = 0;
          currentState = null;
          reconnectDelay = 3000;
          setTimeout(() => init().then(conectar), reconnectDelay);
          return;
        }

        if (code === DisconnectReason.loggedOut || code === 401 || code === 440 || errorMsg.includes('Bad MAC')) {
  // Solo limpiamos si es logout REAL o sesión corrupta
  console.log(`❌ Logout detectado o sesión corrupta (código ${code}). Borrando sesión de DB...`);
  await AuthState.deleteMany({ sessionId });
  currentState = null;
  qrAttempts = 0;
  reconnectDelay = 3000;
  setTimeout(conectar, reconnectDelay);
  return;
}

// 515 es NORMAL cuando WhatsApp cierra la conexión temporalmente (cerrás la app, etc.)
if (code === 515) {
  console.log('🔄 WhatsApp cerró la conexión temporalmente (515). Reconectando en breve...');
  setTimeout(conectar, reconnectDelay);
  reconnectDelay = Math.min(reconnectDelay * 1.5, 30000);
  return;
}

// Cualquier otro cierre (red, timeout, etc.) → reintentar sin limpiar
if (code && code !== DisconnectReason.connectionClosed) {
  console.log(`🔁 Conexión perdida (código ${code}). Reintentando en ${reconnectDelay/1000}s...`);
  setTimeout(conectar, reconnectDelay);
  reconnectDelay = Math.min(reconnectDelay * 1.5, 30000);
} else {
          console.log('📴 Sesión cerrada. Esperando solicitud para reconectar.');
          qrAttempts = 0;
        }
        botStatus = 'disconnected';
        currentQr = null;
      }

      if (connection === 'open') {
        console.log(`✅ Bot conectado a WhatsApp para sesión ${sessionId}`);
        botStatus = 'connected';
        currentQr = null;
        qrAttempts = 0;
        reconnectAttempts = 0;
        reconnectDelay = 3000;
      }
    });

    sock.ev.on('creds.update', currentSaveCreds);

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

      // console.log(`📨 Comando: ${comando} | De: ${remitente} (${esGrupo ? 'grupo' : 'contacto'})`);

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

  if (currentState?.creds?.me) {
    console.log(`✅ Sesión existente detectada en DB para ${sessionId}. Conectando automáticamente...`);
    conectar();
  } else {
    console.log(`📴 No hay sesión activa válida en DB para ${sessionId}. Esperando solicitud para iniciar conexión.`);
  }
}

// Función para iniciar conexión manualmente
const startConnection = async () => {
  await init();
  qrAttempts = 0;
  conectar();
};

// Exportamos directamente
module.exports = { 
  getBotStatus: () => botStatus, 
  getCurrentQr: () => currentQr, 
  getSockGlobal: () => sockGlobal,
  startConnection
};