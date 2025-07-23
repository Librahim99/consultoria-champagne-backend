const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const clientsRoutes = require('./routes/clients');
const incidentsRoutes = require('./routes/incidents');
const assistancesRoutes = require('./routes/assistances');
const pendingRouter = require('./routes/pending');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Conectar a MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('Conectado a MongoDB'))
  .catch(err => console.error('Error al conectar a MongoDB:', err));

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/clients', clientsRoutes);
app.use('/api/incidents', incidentsRoutes);
app.use('/api/assistances', assistancesRoutes)
app.use('/api/pending', pendingRouter)

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));