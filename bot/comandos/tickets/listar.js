const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { Parser } = require('json2csv');
const { getAuthHeader } = require('../../servicios/authService');
const { incident_status } = require('../../../utils/enums');

const BASE_URL = `${process.env.REACT_APP_API_URL}/incidents`;

module.exports = async (sock, numero, args) => {
  const subarg = args[0]?.toLowerCase();
  const exportar = args.includes('exportar');

  const filtro = {};
  if (subarg === 'estado') {
    const estado = args.slice(1).join(' ').toLowerCase();
    if (!estado || !Object.values(incident_status).includes(estado)) {
      return sock.sendMessage(numero, {
        text: `❌ Estado inválido. Usá uno de:\n${Object.values(incident_status).join(', ')}`
      });
    }
    filtro.status = estado;
  } else if (subarg === 'fecha') {
    const fechas = args[1]?.split(',');
    if (!fechas || fechas.length !== 2) {
      return sock.sendMessage(numero, { text: '❌ Usá: `!ticket listar fecha YYYY-MM-DD,YYYY-MM-DD`' });
    }

    const [desdeStr, hastaStr] = fechas;
    const desde = new Date(desdeStr);
    const hasta = new Date(hastaStr);

    if (isNaN(desde.getTime()) || isNaN(hasta.getTime())) {
      return sock.sendMessage(numero, { text: '❌ Fechas inválidas. Usá formato: YYYY-MM-DD' });
    }

    filtro.creationDate = { $gte: desde, $lte: hasta };
  } else {
    return sock.sendMessage(numero, {
      text: `📋 Usá una de estas opciones:
- \`!ticket listar estado pendiente\`
- \`!ticket listar fecha 2024-07-01,2024-07-23\`
- Agregá \`exportar\` al final para generar el CSV`
    });
  }

  try {
    const res = await axios.get(BASE_URL, {
      headers: getAuthHeader()
    });

    const tickets = res.data.filter(t => {
      if (filtro.status) return t.status === filtro.status;
      if (filtro.creationDate) {
        const fecha = new Date(t.creationDate);
        return fecha >= filtro.creationDate.$gte && fecha <= filtro.creationDate.$lte;
      }
      return false;
    });

    if (!tickets.length) {
      return sock.sendMessage(numero, {
        text: `📭 No se encontraron tickets con ese filtro.`
      });
    }

    const listado = tickets.map((t, i) =>
      `${i + 1}. *${t.subject || 'Ticket'}* [${t.status}]
🗓️ ${new Date(t.creationDate).toLocaleDateString()}
📝 ${t.detail.slice(0, 100)}...`
    ).join('\n\n');

    await sock.sendMessage(numero, {
      text: `📋 *Listado de Tickets filtrados:*\n\n${listado}`
    });

    // 🧾 Si pidió exportar
    if (exportar) {
      const fields = ['sequenceNumber', 'status', 'subject', 'detail', 'creationDate'];
      const parser = new Parser({ fields });
      const csv = parser.parse(tickets);

      const tempPath = path.join(__dirname, `tickets_filtrados_${Date.now()}.csv`);
      fs.writeFileSync(tempPath, csv);

      await sock.sendMessage(numero, {
        document: fs.readFileSync(tempPath),
        mimetype: 'text/csv',
        fileName: 'tickets_filtrados.csv'
      });

      fs.unlinkSync(tempPath);
    }

  } catch (err) {
    console.error('❌ Error al listar tickets:', err.response?.data || err.message);
    return sock.sendMessage(numero, {
      text: '🚨 Hubo un error procesando el listado. Intentá más tarde.'
    });
  }
};
