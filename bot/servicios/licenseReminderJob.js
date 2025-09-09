// bot/servicios/licenseReminderJob.js
const Client = require('../../models/Client');
const LicenseReminderLog = require('../../models/LicenseReminderLog');
const botModule = require('../../bot'); // mismo patrón que adminbot usa para el socket:contentReference[oaicite:2]{index=2}
const getSockGlobal = botModule.getSockGlobal;

const LICENSE_DURATION_DAYS = Number(process.env.LICENSE_DURATION_DAYS || 62);
const DEFAULT_MAX_DAYS_EXCLUSIVE = Number(process.env.REMINDER_THRESHOLD_DAYS_EXCLUSIVE || 14);
const GROUP_JID = process.env.LICENSES_GROUP_JID;

// 🔧 normaliza a medianoche (local) y calcula diferencia en días truncada
function daysDiffLocal(to, from = new Date()) {
  const a = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  const b = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const MS = 86400000;
  return Math.floor((a.getTime() - b.getTime()) / MS);
}

function todayKey() {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function diffInDaysUTC(a,b){const MS=86400000;return Math.floor((Date.UTC(a.getFullYear(),a.getMonth(),a.getDate())-Date.UTC(b.getFullYear(),b.getMonth(),b.getDate()))/MS);}

function buildMsg(c, diasRestantes, venc) {
  const fechaVencStr = venc.toLocaleDateString('es-AR');
  return `*🔔 PRÓXIMAS LICENCIAS A VENCER 🔔*
*${c.name}*  (${c.common||'s/código'})
Vence en *${diasRestantes} días*  (Fecha: ${fechaVencStr})
*Coordinar actualización si es necesario*`;
}

// línea formateada para el mensaje batch
function formatLine(c, diasRestantes, venc){
  const fecha = venc.toLocaleDateString('es-AR');
  return `• *${c.name}* (${c.common || 's/código'}) — ${diasRestantes} día(s) — vence: ${fecha}`;
}


async function sendForClient(client, { dryRun=false, dateKey=todayKey(), diasRestantes, daysBefore = DEFAULT_MAX_DAYS_EXCLUSIVE } = {}) {
  if (!GROUP_JID) throw new Error('Falta LICENSES_GROUP_JID');
  const venc = new Date(client.lastUpdate); venc.setDate(venc.getDate() + LICENSE_DURATION_DAYS);
  const msg = buildMsg(client, diasRestantes ?? diffInDaysUTC(venc, new Date()), venc);
  if (!dryRun) {
    await getSockGlobal()?.sendMessage(GROUP_JID, { text: msg });
    await LicenseReminderLog.create({ clientId: client._id, dateKey, daysBefore, groupJid: GROUP_JID });
  }
  return { client: client.name, sentTo: GROUP_JID, dryRun };
}

async function runLicenseReminders({
  dryRun = false,
  maxDays = DEFAULT_MAX_DAYS_EXCLUSIVE,
  minDays = 0,                  // ✅ ahora aceptamos negativos (ej. -10)
  noDedup = false               // ✅ permite reenviar sin bloquear por log
} = {}) {
  if (!GROUP_JID) throw new Error('Falta LICENSES_GROUP_JID');
  const dateKey = todayKey();
  const hoy = new Date();
  const query = { active: true };
  const clients = await Client.find(query).lean();

  // 1) Filtrar candidatos y ordenar por días restantes (asc)
  const candidates = [];
  for (const c of clients) {
    if (!c.lastUpdate) continue;
    const venc = new Date(c.lastUpdate);
    venc.setDate(venc.getDate() + LICENSE_DURATION_DAYS);
    const diasRestantes = diffInDaysUTC(venc, hoy);
    // Rango min..max (ej. -10..15)
    if (diasRestantes < minDays || diasRestantes > maxDays) continue;
    candidates.push({ client: c, diasRestantes, venc });

    // anti-duplicado diario por cliente/umbral
    // if (!noDedup) {
    //   const dup = await LicenseReminderLog.findOne({ clientId: c._id, dateKey, daysBefore: maxDays });
    //   if (dup) { out.push({ client: c.name, skipped: 'duplicate' }); continue; }
    // } else {
    // }
  }
  const sendables = candidates.filter(x => !x.skipped).sort((a,b)=> a.diasRestantes - b.diasRestantes);

  // 2) Si hay para enviar y no es dryRun, armar mensaje ÚNICO
if (!dryRun && sendables.length > 0) {
  const lines = sendables.map(x =>
    `▪️ *${x.client.name}* → ⏳ ${x.diasRestantes} días • 📅 ${x.venc.toLocaleDateString('es-AR')}`
  );

  const header = `*🚨 Licencias Próximas a Vencer*  \n👥 Total: ${sendables.length}`;
  const footer = `\n\n🔄 *Recordá coordinar la renovación* 🔄`;

  let text = `${header}\n\n${lines.join('\n')}${footer}`;

  const sock = getSockGlobal?.();
  const MAX_LEN = 3500;
  if (text.length <= MAX_LEN) {
    await sock?.sendMessage(GROUP_JID, { text });
  } else {
    // dividir en chunks sin cortar líneas
    let buffer = header + '\n\n';
    for (const line of lines) {
      if ((buffer + line + '\n').length > MAX_LEN) {
        await sock?.sendMessage(GROUP_JID, { text: buffer.trimEnd() });
        buffer = '';
      }
      buffer += line + '\n';
    }
    if (buffer.trim().length) {
      buffer += footer;
      await sock?.sendMessage(GROUP_JID, { text: buffer.trimEnd() });
    }
  }

  // 3) Crear logs por cada cliente enviado
  // await Promise.all(
  //   sendables.map(x =>
  //     LicenseReminderLog.create({
  //       clientId: x.client._id,
  //       dateKey,
  //       daysBefore: maxDays,
  //       groupJid: GROUP_JID
  //     })
  //   )
  // );
}

  // 4) Respuesta compatible con el frontend (lista de items)
  return candidates.map(x => ({
    client: x.client.name,
    diasRestantes: x.diasRestantes,
    skipped: x.skipped,
    dryRun
  }));
}

// function scheduleEveryMinutes(minutes = Number(process.env.REMINDER_FREQ_MINUTES || 60)) {
//   const m = Math.max(5, minutes|0); // piso 5 minutos por seguridad
//   // kickoff inmediato para no esperar 1h en pruebas
//   runLicenseReminders().catch(console.error);
//   setInterval(() => runLicenseReminders().catch(console.error), m * 60 * 1000);
// }

module.exports = { runLicenseReminders, sendForClient };