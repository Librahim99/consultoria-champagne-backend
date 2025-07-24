const path = require('path');
const fs = require('fs');
const { model } = require('../../../utils/model.js');
const User = model('User');

module.exports = async (sock, numero, texto) => {
  const args = texto.trim().split(' ');
  const subcomando = args[1]?.toLowerCase();

  if (!args[1]) {
    return mostrarAyuda(sock, numero);
  }

  try {
    // Buscar usuario por teléfono
    const telefono = numero.split('@')[0];
    const username = 'Consultor-IA'
    const usuario = await User.findOne({ username });

    console.log(usuario)

    if (!usuario) {
      return sock.sendMessage(numero, {
        text: '⛔ No estás registrado como usuario autorizado para usar tickets.'
      });
    }

    // Subcomando como archivo individual
    const comandoPath = path.join(__dirname, `${subcomando}.js`);
    if (fs.existsSync(comandoPath)) {
      const ejecutarComando = require(comandoPath);
      return await ejecutarComando(sock, { key: { remoteJid: numero } }, args.slice(2), usuario);
    }

    // Interpretar como creación rápida
    const detalle = args.slice(1).join(' ');
    if (!detalle || detalle.length < 5) {
      return sock.sendMessage(numero, {
        text: '❌ Para crear un ticket usá:\n`!ticket crear <detalle>` o simplemente `!ticket <detalle>`'
      });
    }

    const crearTicket = require('./crear.js');
    const defaultClientId = usuario.clientId || telefono; // ← ajustalo según tu modelo
    const defaultTipo = 'consulta';
    const defaultAsunto = 'Consulta directa';

    return await crearTicket(sock, { key: { remoteJid: numero } }, [detalle], {
  _id: '1234',
  username: 'Tester',
  telefono: numero,
  rank: 'total_access',
  clientId: 'demo-client-id'
});

  } catch (err) {
    console.error(`❌ Error en comando !ticket:`, err);
    return sock.sendMessage(numero, {
      text: '🚨 Error procesando el comando. Revisá el log del servidor.'
    });
  }
};

function mostrarAyuda(sock, numero) {
  return sock.sendMessage(numero, {
    text: `
🎫 *Panel de Gestión de Tickets - Interactivo*

1️⃣ *Crear:* !ticket crear <detalle>
2️⃣ *Estado:* !ticket estado <id> <nuevo_estado>
3️⃣ *Asignar:* !ticket asignar <id> <usuario>
4️⃣ *Cerrar:* !ticket cerrar <id>
5️⃣ *Eliminar:* !ticket borrar <id>
6️⃣ *Listar:* !ticket listar estado <estado>
7️⃣ *Listar:* !ticket listar fecha <YYYY-MM-DD,YYYY-MM-DD>

💡 _También podés crear un ticket directo:_  
\`!ticket No puedo imprimir desde Chrome\`
`
  });
}
