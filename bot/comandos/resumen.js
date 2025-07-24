const fs = require('fs');
const path = require('path');
const { Parser } = require('json2csv');
const Incident = require('../../models/Incident');

const emojisEstado = {
  pendiente: '⏳',
  'en progreso': '🔧',
  resuelto: '✅',
  completado: '📦',
  cancelado: '❌',
  prueba: '🧪',
  presupuestar: '📐',
  presupuestado: '💰',
  revisión: '🔍',
  abierto: '🟢',
  cerrado: '🔴'
};

module.exports = async (sock, numero, texto) => {
  try {
    const args = texto.trim().split(' ');
    const dias = parseInt(args[1], 10);
    const exportar = args.includes('exportar');

    let filtroFecha = {};

    if (!isNaN(dias) && dias > 0) {
      const desde = new Date();
      desde.setDate(desde.getDate() - dias);
      filtroFecha.creationDate = { $gte: desde };
    }

    // Agrupación
    const pipeline = [
      { $match: filtroFecha },
      { $group: { _id: '$status', cantidad: { $sum: 1 } } }
    ];

    const resultados = await Incident.aggregate(pipeline);
    const total = await Incident.countDocuments(filtroFecha);

    if (!total) {
      return sock.sendMessage(numero, { text: '📭 No hay tickets registrados.' });
    }

    // 📨 Enviar resumen como mensaje
    let msg = `📊 *Resumen de Tickets${dias ? ` (últimos ${dias} días)` : ''}:*\n\n🔢 Total: ${total}\n`;
    resultados.forEach(r => {
      const emoji = emojisEstado[r._id] || '•';
      msg += `${emoji} *${r._id}:* ${r.cantidad}\n`;
    });

    await sock.sendMessage(numero, { text: msg.trim() });

    // 📁 Si se especificó "exportar", generar y enviar CSV
    if (exportar) {
  const fields = ['Estado', 'Cantidad'];
  const data = resultados.map(r => ({
    Estado: r._id,
    Cantidad: r.cantidad
  }));

  const parser = new Parser({ fields });
  const csv = parser.parse(data);

  const tempDir = path.join(__dirname, '../../temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
  }

  const filePath = path.join(tempDir, 'resumen_tickets.csv');
  fs.writeFileSync(filePath, csv);

  await sock.sendMessage(numero, {
    document: fs.readFileSync(filePath),
    mimetype: 'text/csv',
    fileName: 'resumen_tickets.csv'
  });

  fs.unlinkSync(filePath); // 💣 Limpieza después del envío
}

  } catch (err) {
    console.error('❌ Error generando resumen:', err);
    await sock.sendMessage(numero, { text: '🚨 No se pudo generar el resumen.' });
  }
};
