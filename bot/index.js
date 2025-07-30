// index.js
const {
  default: makeWASocket,
  DisconnectReason,
  fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');

const fs = require('fs');
const path = require('path');
const pino = require('pino');

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
const maxReconnectAttempts = 5; // Límite de reintentos
let reconnectDelay = 3000; // Delay inicial

// Sesión actual (default de env, mutable)
let currentSessionId = process.env.SESSION_ID || 'default';
console.log(`🆔 Iniciando con sesión default: ${currentSessionId}`);

// Variables para state y saveCreds (para recargar en switch)
let currentState = null;
let currentSaveCreds = null;

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

// Función conectar definida globalmente (reutilizable)
let conectar = null;

// Función de inicialización (async)
async function init() {
  const { state, saveCreds } = await useMongoAuthState(currentSessionId);
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
      browser: ['Bot Mantis', 'Chrome', '10.0']
    });

    sockGlobal = sock;

    sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
      if (qr) {
        qrAttempts++;
        console.log(`🔄 QR generado (intento ${qrAttempts}/${maxQrAttempts}) para sesión ${currentSessionId}`);
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
          console.error(`❌ Máximo de reintentos (${maxReconnectAttempts}) alcanzado para ${currentSessionId}. Reiniciando sesión...`);
          await AuthState.deleteMany({ sessionId: currentSessionId });
          reconnectAttempts = 0;
          qrAttempts = 0;
          currentState = null;
          reconnectDelay = 3000; // Reset delay
          setTimeout(() => init().then(conectar), reconnectDelay);
          return;
        }

        if (errorMsg.includes('Bad MAC') || code === DisconnectReason.loggedOut || code === 440 || code === 515) { // CAMBIO: Manejo de 440 y 515 como inválido
          console.log(`❌ Sesión inválida (Bad MAC/loggedOut/440/515) para ${currentSessionId}. Limpiando DB y reconectando...`);
          await AuthState.deleteMany({ sessionId: currentSessionId });
          qrAttempts = 0;
          currentState = null;
          setTimeout(conectar, reconnectDelay);
          reconnectDelay = Math.min(reconnectDelay * 2, 60000); // Backoff: duplica delay, max 60s
        } else if (code !== DisconnectReason.loggedOut) {
          console.log('🔁 Reintentando conexión en ' + (reconnectDelay / 1000) + 's...');
          setTimeout(conectar, reconnectDelay);
          reconnectDelay = Math.min(reconnectDelay * 1.5, 30000); // Backoff suave
        } else {
          console.log('📴 Sesión cerrada. Esperando solicitud para reconectar.');
          qrAttempts = 0;
        }
        botStatus = 'disconnected';
        currentQr = null;
      }

      if (connection === 'open') {
        console.log(`✅ Bot conectado a WhatsApp para sesión ${currentSessionId}`);
        botStatus = 'connected';
        currentQr = null;
        qrAttempts = 0;
        reconnectAttempts = 0;
        reconnectDelay = 3000; // Reset delay al conectar
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

  if (currentState?.creds?.me) {
    console.log(`✅ Sesión existente detectada en DB para ${currentSessionId}. Conectando automáticamente...`);
    conectar();
  } else {
    console.log(`📴 No hay sesión activa válida en DB para ${currentSessionId}. Esperando solicitud para iniciar conexión.`);
  }
}

// Función para iniciar conexión manualmente
const startConnection = async () => {
  await init(); // Asegura que init se ejecute si no lo ha hecho
  qrAttempts = 0;
  conectar(); // Llama directamente, ahora global
};

// Función para switch sesión
const switchSession = async (newSessionId) => {
  if (newSessionId === currentSessionId) {
    console.log(`🆔 Sesión ya es ${newSessionId}. Sin cambios.`);
    return { success: true, message: 'Sesión ya activa.' };
  }

  console.log(`🔄 Cambiando a sesión ${newSessionId}...`);

  if (sockGlobal) {
    await sockGlobal.end();
    sockGlobal = null;
    botStatus = 'disconnected';
    currentQr = null;
    qrAttempts = 0;
    reconnectAttempts = 0; // Resetea al cambiar
    reconnectDelay = 3000;
  }

  currentSessionId = newSessionId;
  const { state, saveCreds } = await useMongoAuthState(currentSessionId);
  if (!state || !state.creds || !state.creds.me) {
    console.warn(`⚠️ Estado inválido para ${newSessionId}. Reiniciando...`);
    await AuthState.deleteMany({ sessionId: newSessionId });
  }
  currentState = state;
  currentSaveCreds = saveCreds;

  conectar(); // Llama directamente

  return { success: true, message: `Sesión cambiada a ${newSessionId}. Reconectando...` };
};

// Función para listar sesiones únicas
const getSessions = async () => {
  const sessions = await AuthState.distinct('sessionId');
  return sessions.length > 0 ? sessions : ['default'];
};

// CAMBIO: Nueva función para reset sesión (para endpoint)
const resetSession = async (sessionId = currentSessionId) => {
  console.log(`🧹 Reseteando sesión ${sessionId}...`);
  await AuthState.deleteMany({ sessionId });
  botStatus = 'disconnected';
  currentQr = null;
  qrAttempts = 0;
  reconnectAttempts = 0;
  reconnectDelay = 3000;
  currentState = null;
  if (sockGlobal) {
    await sockGlobal.end();
    sockGlobal = null;
  }
  await init(); // Reinicia state
  conectar(); // Reconecta con QR nuevo
  return { success: true, message: `Sesión ${sessionId} reseteada. Escanea QR nuevo.` };
};

// Exportamos directamente
module.exports = { 
  getBotStatus: () => botStatus, 
  getCurrentQr: () => currentQr, 
  getSockGlobal: () => sockGlobal,
  startConnection,
  switchSession,
  getSessions,
  getCurrentSessionId: () => currentSessionId,
  resetSession // Nueva
};

// Ejecutamos init al requerir el módulo (para inicialización automática)
init().catch(err => console.error('❌ Error en init:', err));