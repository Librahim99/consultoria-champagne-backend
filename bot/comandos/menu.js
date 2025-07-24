module.exports = async (sock, numero) => {
  const mensaje = `
🤖 *Mantis CRM Bot – Panel Interactivo*

Seleccioná una opción o escribí un comando:

━━━━━━━━━━━━━━━━━━━━
🎫 *Tickets e Incidentes*
━━━━━━━━━━━━━━━━━━━━
🆕 Crear: \`!ticket crear <detalle>\`
🧑‍🔧 Asignar: \`!ticket asignar <id> <usuario>\`
📌 Estado: \`!ticket estado <id> <nuevo_estado>\`
✅ Cerrar: \`!ticket cerrar <id>\`
🗑️ Eliminar: \`!ticket borrar <id>\`
📋 Listar: \`!ticket listar estado:<estado>\`  
📅 Por Fecha: \`!ticket listar fecha:YYYY-MM-DD,YYYY-MM-DD\`
🔍 Ver detalle: \`!incidente <id>\`

━━━━━━━━━━━━━━━━━━━━
⏳ *Pendientes*
━━━━━━━━━━━━━━━━━━━━
➕ Crear: \`!pendiente <idCliente;idUser;detalle;estado;obs;idIncidente>\`

━━━━━━━━━━━━━━━━━━━━
👥 *Gestión de Clientes*
━━━━━━━━━━━━━━━━━━━━
🔎 Buscar: \`!cliente <nombre|código>\`
✏️ Editar: \`!cliente actualizar <id> campo:valor\`
⭐ VIP: \`!clientes vip\`
✅ Activos: \`!clientes activos\`

━━━━━━━━━━━━━━━━━━━━
📚 *Centro de Ayuda*
━━━━━━━━━━━━━━━━━━━━
❓ Preguntas frecuentes: \`!faq\`
☎️ Contacto soporte: \`!soporte\`

━━━━━━━━━━━━━━━━━━━━
🛠️ *Administración*
━━━━━━━━━━━━━━━━━━━━
📄 Ver logs: \`!log\`
📊 Exportar reporte: \`!reporte\`

━━━━━━━━━━━━━━━━━━━━
🏷️ *Estados Disponibles*
━━━━━━━━━━━━━━━━━━━━
\`pendiente\`, \`en progreso\`, \`resuelto\`, \`completado\`,  
\`cancelado\`, \`prueba\`, \`presupuestar\`, \`presupuestado\`, \`revisión\`

━━━━━━━━━━━━━━━━━━━━
📌 *Ejemplos útiles*
━━━━━━━━━━━━━━━━━━━━
🆕 \`!ticket crear No funciona mi sistema\`  
📋 \`!ticket listar estado:pendiente\`  
📅 \`!ticket listar fecha:2025-07-01,2025-07-15\`
`;

  const buttons = [
    { buttonId: '!ticket crear', buttonText: { displayText: '🆕 Crear Ticket' }, type: 1 },
    { buttonId: '!ticket listar estado:pendiente', buttonText: { displayText: '📋 Ver Pendientes' }, type: 1 },
    { buttonId: '!cliente', buttonText: { displayText: '👥 Clientes' }, type: 1 },
    { buttonId: '!faq', buttonText: { displayText: '❓ FAQ' }, type: 1 },
    { buttonId: '!reporte', buttonText: { displayText: '📊 Reporte' }, type: 1 },
    { buttonId: '!soporte', buttonText: { displayText: '☎️ Soporte' }, type: 1 }
  ];

  await sock.sendMessage(numero, {
    text: mensaje.trim(),
    buttons,
    footer: '📌 Mantis Software © 2025',
    headerType: 1,
    contextInfo: {
      externalAdReply: {
        title: 'Centro de Control Mantis',
        body: 'Automatización de soporte en tiempo real',
        mediaType: 1,
        thumbnailUrl: 'https://mantis.com.ar/wp-content/uploads/2024/11/Logotipo.svg',
        sourceUrl: 'https://mantis.com.ar'
      }
    }
  });
};
