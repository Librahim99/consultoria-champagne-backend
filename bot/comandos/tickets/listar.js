const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { Parser } = require('json2csv');
const { getAuthHeader } = require('../../servicios/authService');
const { incident_status } = require('../../../utils/enums');
const { responderOk, responderError, responderAdvertencia, MESSAGES } = require('../../../utils/respuestas');

const BASE_URL = `${process.env.REACT_APP_API_URL}/api/incidents`;

module.exports = {
  comando: ['listar', 'tickets'], // Agregado para consistencia y escalabilidad
  descripcion: 'Lista tickets filtrados por estado o fecha',
  ejemplo: '!ticket listar estado pendiente o !ticket listar fecha 2024-07-01,2024-07-31 exportar',
  uso: '!ticket listar <estado o fecha> [exportar]',
  requiereAuth: true,

  async ejecutar({ bot, mensaje, argumentos }) {
    const numero = mensaje.key.remoteJid; // Extraemos numero del mensaje para compatibilidad
    const subarg = argumentos[0]?.toLowerCase();
    const exportar = argumentos.includes('exportar');

    const filtro = {};
    if (subarg === 'estado') {
      const estado = argumentos[1]
      if (!estado || !Object.values(incident_status).includes(estado)) {
        return responderAdvertencia(bot, mensaje, MESSAGES.ESTADO_LISTAR_INVALIDO(Object.values(incident_status).join(', ')));
      }
      filtro.status = estado;
    } else if (subarg === 'fecha') {
      const fechas = argumentos[1]?.split(',');
      if (!fechas || fechas.length !== 2) {
        return responderAdvertencia(bot, mensaje, MESSAGES.FORMATO_LISTAR_INVALIDO);
      }

      const [desdeStr, hastaStr] = fechas;
      const desde = new Date(desdeStr);
      const hasta = new Date(hastaStr);

      if (isNaN(desde.getTime()) || isNaN(hasta.getTime())) {
        return responderAdvertencia(bot, mensaje, MESSAGES.FECHAS_INVALIDAS);
      }

      filtro.creationDate = { $gte: desde, $lte: hasta };
    } else {
      return responderAdvertencia(bot, mensaje, MESSAGES.FORMATO_LISTAR_INVALIDO);
    }

    try {
console.log('entró 1')
      const res = await axios.get(BASE_URL, {
        headers: getAuthHeader()
      });
console.log(res)


      const tickets = res.data.filter(t => {
        if (filtro.status) return t.status === filtro.status;
        if (filtro.creationDate) {
          const fecha = new Date(t.creationDate);
          return fecha >= filtro.creationDate.$gte && fecha <= filtro.creationDate.$lte;
        }
        return false;
      });

      if (!tickets.length) {
        return responderAdvertencia(bot, mensaje, MESSAGES.SIN_TICKETS);
      }

      const listado = tickets.map((t, i) =>
        `${i + 1}. *${t.subject || 'Ticket'}* [${t.status}]
🗓️ ${new Date(t.creationDate).toLocaleDateString()}
📝 ${t.detail.slice(0, 100)}...`
      ).join('\n\n');

      await responderOk(bot, mensaje, MESSAGES.LISTADO_TICKETS(listado));

      // 🧾 Si pidió exportar
      if (exportar) {
        const fields = ['sequenceNumber', 'status', 'subject', 'detail', 'creationDate'];
        const parser = new Parser({ fields });
        const csv = parser.parse(tickets);

        const tempPath = path.join(__dirname, `tickets_filtrados_${Date.now()}.csv`);
        fs.writeFileSync(tempPath, csv);

        await bot.sendMessage(numero, {
          document: fs.readFileSync(tempPath),
          mimetype: 'text/csv',
          fileName: 'tickets_filtrados.csv'
        });

        fs.unlinkSync(tempPath);
      }

    } catch (err) {
      console.error('❌ Error al listar tickets:', err.response?.data || err.message);
      return responderError(bot, mensaje, MESSAGES.ERROR_LISTAR);
    }
  }
};