// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// 🌐 Rutas API
const { loginBot } = require('././bot/servicios/authService');
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const clientsRoutes = require('./routes/clients');
const incidentsRoutes = require('./routes/incidents');
const assistancesRoutes = require('./routes/assistances');
const pendingRouter = require('./routes/pending');

// 🤖 Bot de WhatsApp
const iniciarBot = require('./bot/index');

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

  iniciarBot(); // ← Iniciamos el bot una vez conectada la DB
})
.catch(err => console.error('❌ Error al conectar a MongoDB:', err));

// 🔀 Rutas
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/clients', clientsRoutes);
app.use('/api/incidents', incidentsRoutes);
app.use('/api/assistances', assistancesRoutes);
app.use('/api/pending', pendingRouter);

console.log('authRoutes:', typeof authRoutes);
console.log('usersRoutes:', typeof usersRoutes);
console.log('clientsRoutes:', typeof clientsRoutes);
console.log('incidentsRoutes:', typeof incidentsRoutes);
console.log('assistancesRoutes:', typeof assistancesRoutes);
console.log('pendingRouter:', typeof pendingRouter);


// 🚀 Servidor HTTP
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Servidor corriendo en puerto ${PORT}`));