// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// 🌐 Rutas API
const { loginBot } = require('../bot/servicios/authService');
const authRoutes = require('../routes/auth');
const usersRoutes = require('../routes/users');
const clientsRoutes = require('../routes/clients');
const incidentsRoutes = require('../routes/incidents');
const assistancesRoutes = require('../routes/assistances');
const pendingRouter = require('../routes/pending');
const adminBotRouter = require('../routes/adminbot');

// 🤖 Bot de WhatsApp
const bot = require('../bot/index'); // Require del objeto exportado (inicialización automática)

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// 🔌 Conexión a MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('✅ Conectado a MongoDB');

  loginBot(); // inicia sesión y guarda token

  // No llamar a bot.iniciarBot() ya que se ejecuta automáticamente al require
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
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/clients', clientsRoutes);
app.use('/api/incidents', incidentsRoutes);
app.use('/api/assistances', assistancesRoutes);
app.use('/api/pending', pendingRouter);
app.use('/api/bot', adminBotRouter);

// 🚀 Servidor HTTP
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Servidor corriendo en puerto ${PORT}`));