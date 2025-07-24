// servicios/authService.js
const axios = require('axios');

let token = null;
let tokenExpiraEn = null; // timestamp

const credenciales = {
  username: 'Consultor-IA',
  password: 'mantis44*'
};

const BASE_URL = 'http://localhost:5000/api';

// 🔐 Login
async function loginBot() {
  try {
    const res = await axios.post(`${BASE_URL}/auth/login`, credenciales);
    token = res.data.token;
    
    // Decodifica el token para obtener su expiración
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    tokenExpiraEn = payload.exp * 1000;

    console.log('✅ Bot autenticado correctamente');
    return token;
  } catch (err) {
    console.error('❌ Error de login del bot:', err.response?.data || err.message, '\nDetalles:', err.toJSON?.() || err);
    token = null;
    tokenExpiraEn = null;
    return null;
  }
}

// 📦 Cabecera para requests
function getAuthHeader() {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// 🔁 Verifica si el token está por expirar (5 minutos de margen)
async function ensureTokenValido() {
  const ahora = Date.now();
  if (!token || !tokenExpiraEn || ahora >= tokenExpiraEn - 5 * 60 * 1000) {
    console.log('🔄 Token expirado o por vencer. Reautenticando...');
    await loginBot();
  }
}

// 🔧 Axios con token automáticamente
const axiosConToken = axios.create();

axiosConToken.interceptors.request.use(
  async (config) => {
    await ensureTokenValido();
    config.headers = {
      ...config.headers,
      ...getAuthHeader()
    };
    return config;
  },
  (error) => Promise.reject(error)
);

module.exports = {
  loginBot,
  getAuthHeader,
  axiosConToken
};
