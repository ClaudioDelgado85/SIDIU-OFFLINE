// middleware/auth.js
// Middleware para autenticación y autorización

const jwt = require('jsonwebtoken');
const db = require('../config/database');
require('dotenv').config();

// Lista de módulos válidos del sistema
const MODULOS_VALIDOS = [
  'expedientes', 'intimaciones', 'infracciones', 'reclamos',
  'relevamientos', 'comercios', 'vendedores', 'tareas', 'catalogos'
];

// Verificar token JWT y que el usuario siga activo en la DB
const verifyToken = async (req, res, next) => {
  try {
    // Obtener token del header
    const authHeader = req.headers.authorization;
    const token = authHeader ? authHeader.split(' ')[1] : null; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Acceso denegado. No se proporcionó token de autenticación.'
      });
    }

    // Verificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Verificar que el usuario siga activo en la base de datos
    const [usuarios] = await db.pool.execute(
      'SELECT id, nombre_completo, usuario, email, rol, activo FROM usuarios WHERE id = ?',
      [decoded.id]
    );

    if (usuarios.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no encontrado.'
      });
    }

    if (!usuarios[0].activo) {
      return res.status(403).json({
        success: false,
        message: 'Cuenta desactivada. Contacte al administrador.'
      });
    }

    // Guardar datos actualizados del usuario en la request
    req.usuario = {
      id: usuarios[0].id,
      nombre_completo: usuarios[0].nombre_completo,
      usuario: usuarios[0].usuario,
      email: usuarios[0].email,
      rol: usuarios[0].rol,
      activo: usuarios[0].activo
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expirado. Inicie sesión nuevamente.'
      });
    }
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

// Verificar rol de carga o admin (pueden crear/modificar/eliminar)
const requireCargaOrAdmin = (req, res, next) => {
  if (req.usuario.rol !== 'admin_total' && req.usuario.rol !== 'carga') {
    return res.status(403).json({
      success: false,
      message: 'Acceso denegado. Se requieren permisos de carga o administrador.'
    });
  }
  next();
};

// Verificar acceso a un módulo específico
// Admin: siempre tiene acceso
// Carga: tiene acceso solo si el módulo está habilitado en permisos_modulos
// Consulta: solo tiene acceso a rutas GET
const requireModuloAccess = (modulo) => {
  return async (req, res, next) => {
    try {
      const { rol, id } = req.usuario;

      // Admin siempre tiene acceso total
      if (rol === 'admin_total') {
        return next();
      }

      // Consulta: solo puede hacer GET (lectura)
      if (rol === 'consulta') {
        if (req.method === 'GET') {
          return next();
        }
        return res.status(403).json({
          success: false,
          message: 'Acceso denegado. Su rol es de solo consulta.'
        });
      }

      // Carga: verificar permisos de módulo
      if (rol === 'carga') {
        const [permisos] = await db.pool.execute(
          'SELECT habilitado FROM permisos_modulos WHERE usuario_id = ? AND modulo = ?',
          [id, modulo]
        );

        // Política de ZERO TRUST (Cero Confianza - Default Deny)
        // Solo ingresa si existe el permiso EN LA BASE DE DATOS y está habilitado en true (1)
        if (permisos.length > 0 && permisos[0].habilitado) {
          return next();
        }

        return res.status(403).json({
          success: false,
          message: `Acceso denegado al módulo "${modulo}". Contacte al administrador.`
        });
      }

      // Rol no reconocido
      return res.status(403).json({
        success: false,
        message: 'Rol de usuario no reconocido.'
      });
    } catch (error) {
      console.error('Error al verificar acceso a módulo:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al verificar permisos.'
      });
    }
  };
};

module.exports = {
  verifyToken,
  requireAdmin,
  requireCargaOrAdmin,
  requireModuloAccess,
  MODULOS_VALIDOS
};
