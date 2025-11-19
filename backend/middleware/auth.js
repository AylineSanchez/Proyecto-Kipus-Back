// backend/middleware/auth.js (versión recomendada)
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'tu_clave_secreta_muy_segura';

const authMiddleware = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Acceso denegado. Token no proporcionado.'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // Usar 'user' en lugar de 'usuario' para consistencia
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Token inválido o expirado'
    });
  }
};

module.exports = authMiddleware;