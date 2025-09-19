const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

process.env.TZ = 'America/Argentina/Buenos_Aires';
// 🌐 Rutas API
const { loginBot } = require('../bot/servicios/authService');
const authRoutes = require('../routes/auth');
const usersRoutes = require('../routes/users');
const clientsRoutes = require('../routes/clients');
const incidentsRoutes = require('../routes/incidents');
const assistancesRoutes = require('../routes/assistances');
const pendingRouter = require('../routes/pending');
const adminBotRouter = require('../routes/adminbot');
const licensesRoutes = require('../routes/licenses');
const budgetsRoutes = require('../routes/budgets');

// 🤖 Bot de WhatsApp
const bot = require('../bot/index'); // Require del objeto exportado (sin inicialización automática)
const { runLicenseReminders } = require('../bot/servicios/licenseReminderJob');
// const { scheduleEveryMinutes } = require('../bot/servicios/licenseReminderJob'); // ✅ scheduler por hora


dotenv.config({ quiet: true });

const app = express();
app.use(cors({
  origin: ['https://dead-kit-consultoria-champagne-3e322418.koyeb.app'], // front dev
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  credentials: false
}));
app.options('*', cors());
app.use(express.json());

// 🔌 Conexión a MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(async () => {
  console.log('✅ Conectado a MongoDB');

  // Importar AuthState después de conectar a MongoDB
  // const { AuthState } = require('../models/AuthState');
  
  // Limpiar credenciales para el sessionId actual al iniciar el servidor
  // const sessionId = process.env.SESSION_ID || 'default';
  // try {
  //   await AuthState.deleteMany({ sessionId });
  //   console.log(`🧹 Credenciales para sessionId ${sessionId} eliminadas al iniciar el servidor`);
  // } catch (err) {
  //   console.error(`❌ Error al eliminar credenciales para sessionId ${sessionId}:`);
  // }

  loginBot(); // Inicia sesión y guarda token (mantiene funcionalidad existente)

  // ⏰ Arrancar scheduler cada 60 minutos (kickoff inmediato)
  // try {
  //   scheduleEveryMinutes( Number(process.env.REMINDER_FREQ_MINUTES || 5) ); // usa REMINDER_FREQ_MINUTES=60 si querés tunear
  //   console.log('⏰ Scheduler de licencias: cada 5 minutos (rango <15 días)');
  // } catch (e) {
  //   console.error('❌ No se pudo iniciar el scheduler:', e.message);
  // }
 // ⏰ Scheduler: 2 veces por día (09:00 y 14:00 AR), solo Lunes-Viernes
  const MS = 60 * 1000;
  const TARGETS = [{ h: 9, m: 0, slot: 'AM' }, 
    { h: 14, m: 0, slot: 'PM' }]
  const inBA = (d)=> new Date(d.toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));
  const nextRunAt = ({h,m})=>{
    const now = inBA(new Date());
    const run = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0, 0);
    if (run <= now) run.setDate(run.getDate()+1);
    return run;
  };
  const isWeekday = (d)=> [1,2,3,4,5].includes(inBA(d).getDay()); // 1..5 = lun..vie
  const scheduleOnce = ({h,m,slot})=>{
    const tgt = nextRunAt({h,m});
    const delay = tgt - inBA(new Date());
    setTimeout(async () => {
      if (isWeekday(new Date())) {
        try {
          // ventana pedida: -10 .. 15 (en tu front ya mostrás 16 como “≤15”)
          await runLicenseReminders({ dryRun:false, minDays:-10, maxDays:15, runSlot:slot });
        } catch(e){ console.error('reminder fail', e); }
      }
      // reprogramar para el día siguiente
      scheduleOnce({h,m,slot});
    }, Math.max(delay, MS));
  };
  TARGETS.forEach(scheduleOnce);




})
.catch(err => console.error('❌ Error al conectar a MongoDB:', err));

app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

app.get('/ping', (req, res) => res.send('OK'));

// 🔀 Rutas
app.use('/api/licenses', licensesRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/clients', clientsRoutes);
app.use('/api/incidents', incidentsRoutes);
app.use('/api/assistances', assistancesRoutes);
app.use('/api/pending', pendingRouter);
app.use('/api/bot', adminBotRouter);
app.use('/api/budgets', budgetsRoutes);  

app.use((err, req, res, next) => {
  console.error('💥 Error:', err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Server error' });
});

// 🚀 Servidor HTTP
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Servidor corriendo en puerto ${PORT}`));