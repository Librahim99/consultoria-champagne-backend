// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const jsonwebtoken = require('jsonwebtoken'); // Para authMiddleware
const rateLimit = require('express-rate-limit'); // Nueva para optimización
const QRCode = require('qrcode'); // Nueva para QR dataURL

// 🌐 Rutas API
const { loginBot } = require('../bot/servicios/authService');
const authRoutes = require('../routes/auth');
const usersRoutes = require('../routes/users');
const clientsRoutes = require('../routes/clients');
const incidentsRoutes = require('../routes/incidents');
const assistancesRoutes = require('../routes/assistances');
const pendingRouter = require('../routes/pending');

// 🤖 Bot de WhatsApp
const { iniciarBot, getSock, getCurrentQR } = require('../bot/index');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Rate-limit para endpoints bot (optimización seguridad/escalabilidad)
const botLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 50 // Max requests
});
app.use('/api/bot-', botLimiter);

// Middleware auth JWT (básico; reemplaza si tienes middleware/auth.js)
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No autorizado' });
  try {
    jsonwebtoken.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    res.status(401).json({ error: 'Token inválido' });
  }
};

// Endpoints bot nuevos
app.get('/api/bot-qr', authMiddleware, async (req, res) => {
  const qr = getCurrentQR();
  if (!qr) return res.json({ qr: null, message: 'Bot conectado o no QR disponible' });
  try {
    const qrImage = await QRCode.toDataURL(qr);
    res.json({ qr: qrImage });
  } catch (err) {
    console.error('Error generando QR:', err);
    res.status(500).json({ error: 'Error generando QR' });
  }
});

app.get('/api/bot-status', authMiddleware, (req, res) => {
  const status = getSock()?.user ? 'conectado' : 'desconectado';
  res.json({ status });
});

app.post('/api/bot-start', authMiddleware, (req, res) => {
  iniciarBot(true); // Force reconnect
  res.json({ message: 'Intentando prender bot...' });
});

app.post('/api/bot-logout', authMiddleware, (req, res) => {
  // Clear DB collection for logout
  require('../../models/AuthState').deleteMany({}).exec();
  iniciarBot(true); // Force new connection with QR
  res.json({ message: 'Logout exitoso, generando nuevo QR...' });
});

// 🔌 Conexión a MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('✅ Conectado a MongoDB');

  loginBot(); // inicia sesión y guarda token

  iniciarBot(); // ← Iniciamos el bot una vez conectada la DB
})
.catch(err => console.error('❌ Error al conectar a MongoDB:', err));

app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

// 🔀 Rutas
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/clients', clientsRoutes);
app.use('/api/incidents', incidentsRoutes);
app.use('/api/assistances', assistancesRoutes);
app.use('/api/pending', pendingRouter);

// 🚀 Servidor HTTP
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Servidor corriendo en puerto ${PORT}`));