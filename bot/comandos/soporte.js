module.exports = async (sock, numero) => {
  const mensaje = `
📞 *Centro de Soporte – Mantis IT*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👨‍💻 *Equipo Técnico*
• *Alejandro Izarra* → wa.me/5491128932442
• *Alejandro Tones* → wa.me/5491139039019
• *Hermes Llorente* _(Responsable)_ → wa.me/5491123210056
• *Lucas Ibrahim* → wa.me/5491139013921
• *Santiago Sosa* → wa.me/5491136700232
• *Thomas Rodriguez* → wa.me/5491122742445

📧 *Correos útiles*
• alejandro.izarra@mantis.com.ar
• hermes.llorente@mantis.com.ar
• thomas.rodriguez@mantis.com.ar
• lucas.ibrahim@mantis.com.ar
• santiago.sosa@mantis.com.ar
• alejandro.tones@mantis.com.ar

🕒 *Atención:* Lunes a Viernes de 09:00 a 18:00 hs
🌐 *Sitio web:* https://mantis.com.ar *(próximamente)*

💡 Tip: Usá \`!ticket <problema>\` para reportar un incidente al instante.
`;

  const buttons = [
    { buttonId: '!ticket crear', buttonText: { displayText: '🆕 Crear Ticket' }, type: 1 },
    { buttonId: '!faq', buttonText: { displayText: '❓ Ver FAQ' }, type: 1 },
    { buttonId: '!log', buttonText: { displayText: '📄 Ver Tickets' }, type: 1 }
  ];

  await sock.sendMessage(numero, {
    text: mensaje.trim(),
    buttons,
    footer: 'Equipo de Soporte Mantis IT',
    headerType: 1,
    contextInfo: {
      externalAdReply: {
        title: 'Centro de Soporte',
        body: 'Consultas técnicas y seguimiento de tickets',
        mediaType: 1,
        thumbnailUrl: 'https://mantis.com.ar/wp-content/uploads/2024/11/Logotipo.svg',
        sourceUrl: 'https://mantis.com.ar'
      }
    }
  });
};
