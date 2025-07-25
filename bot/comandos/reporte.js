const Incident = require('../../models/Incident');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

module.exports = async (sock, numero) => {
  try {
    const data = await Incident.find().lean();

    if (!data.length) {
      return sock.sendMessage(numero, {
        text: '📭 No hay tickets registrados actualmente para exportar.'
      });
    }

    const jsonData = data.map(t => ({
      ID: t._id?.toString(),
      Asunto: t.subject || 'Sin asunto',
      Estado: t.status || 'Sin estado',
      FechaCreación: t.creationDate ? new Date(t.creationDate).toLocaleString() : '',
      Responsable: t.assignedUserId || 'Sin asignar',
      Detalle: t.detail || 'Sin detalle'
    }));

    const worksheet = XLSX.utils.json_to_sheet(jsonData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Tickets');

    // 📁 Ruta temporal segura
    const tmpDir = path.join(__dirname, '../tmp');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);

    const fecha = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const fileName = `tickets_mantis_${fecha}.xlsx`;
    const filePath = path.join(tmpDir, fileName);

    XLSX.writeFile(workbook, filePath);
    const buffer = fs.readFileSync(filePath);

    // 📤 Enviar archivo por WhatsApp
    await sock.sendMessage(numero, {
      document: buffer,
      fileName,
      mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    // 🧹 Limpieza del archivo temporal
    fs.unlinkSync(filePath);
    
  } catch (err) {
    console.error('❌ Error al generar reporte:', err);
    await sock.sendMessage(numero, {
      text: '⚠️ Hubo un error al generar el archivo de reporte. Intentá más tarde.'
    });
  }
};
