module.exports = function authorize(...allowed) {
  return (req, res, next) => {
    const role = req.user?.rank || req.user?.role; // según tu modelo User
    if (!role) return res.status(401).json({ error: 'No autorizado' });
    if (!allowed.includes(role) && !allowed.includes('*')) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    next();
  };
};
