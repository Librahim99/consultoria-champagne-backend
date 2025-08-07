const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Asegurate de importar tu modelo de usuario

const authMiddleware = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    console.warn('⚠️ Token no enviado');
    return res.status(401).json({ message: 'Acceso denegado. No se proporcionó token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
<<<<<<< HEAD
    // console.log('🔓 Token válido - Usuario:', decoded.username);
=======
    console.log('🔓 Token válido - Usuario:', decoded.username);

>>>>>>> 1d3d224d8f1ecee73f3da978b54f7207a395aedb
    next();
  } catch (error) {
    console.error('❌ Token inválido:', error.message);
    res.status(401).json({ message: 'Token inválido' });
  }
};

module.exports = authMiddleware;
