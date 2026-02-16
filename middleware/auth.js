// middleware/auth.js
// Middleware para autenticación y autorización

const jwt = require('jsonwebtoken');
require('dotenv').config();

// Verificar token JWT
const verifyToken = (req, res, next) => {
  try {
    // Obtener token del header
    const token = req.headers.authorization?.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Acceso denegado. No se proporcionó token de autenticación.'
      });
    }

    // Verificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = decoded; // Guardar datos del usuario en la request
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Token inválido o expirado.'
    });
  }
};

// Verificar rol de administrador total
const requireAdmin = (req, res, next) => {
  if (req.usuario.rol !== 'admin_total') {
    return res.status(403).json({
      success: false,
      message: 'Acceso denegado. Se requieren permisos de administrador.'
    });
  }
  next();
};

// Verificar rol de carga (puede crear y modificar)
const requireCargaOrAdmin = (req, res, next) => {
  if (req.usuario.rol !== 'admin_total' && req.usuario.rol !== 'carga') {
    return res.status(403).json({
      success: false,
      message: 'Acceso denegado. Se requieren permisos de carga o administrador.'
    });
  }
  next();
};

// Verificar que el usuario esté activo
const requireActive = (req, res, next) => {
  if (!req.usuario.activo) {
    return res.status(403).json({
      success: false,
      message: 'Cuenta desactivada. Contacte al administrador.'
    });
  }
  next();
};

module.exports = {
  verifyToken,
  requireAdmin,
  requireCargaOrAdmin,
  requireActive
};
