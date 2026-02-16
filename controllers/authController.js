// controllers/authController.js
// Controlador para autenticación (login, logout)

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
require('dotenv').config();

// Login
exports.login = async (req, res) => {
  try {
    const { usuario, password } = req.body;

    // Validar datos
    if (!usuario || !password) {
      return res.status(400).json({
        success: false,
        message: 'Usuario y contraseña son requeridos.'
      });
    }

    // Buscar usuario en la base de datos
    const sql = 'SELECT * FROM usuarios WHERE usuario = ? AND activo = true';
    const [usuarios] = await db.pool.execute(sql, [usuario]);

    if (usuarios.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Usuario o contraseña incorrectos.'
      });
    }

    const user = usuarios[0];

    // Verificar contraseña
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Usuario o contraseña incorrectos.'
      });
    }

    // Generar token JWT
    const token = jwt.sign(
      {
        id: user.id,
        usuario: user.usuario,
        nombre_completo: user.nombre_completo,
        rol: user.rol,
        activo: user.activo
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    // Respuesta exitosa
    res.json({
      success: true,
      message: 'Login exitoso',
      token,
      usuario: {
        id: user.id,
        nombre_completo: user.nombre_completo,
        usuario: user.usuario,
        email: user.email,
        rol: user.rol
      }
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({
      success: false,
      message: 'Error en el servidor.'
    });
  }
};

// Verificar token (obtener datos del usuario actual)
exports.verificarToken = async (req, res) => {
  try {
    // El usuario ya viene en req.usuario gracias al middleware verifyToken
    res.json({
      success: true,
      usuario: req.usuario
    });
  } catch (error) {
    console.error('Error al verificar token:', error);
    res.status(500).json({
      success: false,
      message: 'Error en el servidor.'
    });
  }
};

// Cambiar contraseña
exports.cambiarPassword = async (req, res) => {
  try {
    const { password_actual, password_nueva } = req.body;
    const usuario_id = req.usuario.id;

    // Validar datos
    if (!password_actual || !password_nueva) {
      return res.status(400).json({
        success: false,
        message: 'Contraseña actual y nueva son requeridas.'
      });
    }

    if (password_nueva.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'La contraseña debe tener al menos 6 caracteres.'
      });
    }

    // Obtener usuario actual
    const sql = 'SELECT password_hash FROM usuarios WHERE id = ?';
    const [usuarios] = await db.pool.execute(sql, [usuario_id]);

    if (usuarios.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado.'
      });
    }

    // Verificar contraseña actual
    const passwordMatch = await bcrypt.compare(password_actual, usuarios[0].password_hash);

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Contraseña actual incorrecta.'
      });
    }

    // Hash de la nueva contraseña
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password_nueva, salt);

    // Actualizar contraseña
    const updateSql = 'UPDATE usuarios SET password_hash = ? WHERE id = ?';
    await db.pool.execute(updateSql, [password_hash, usuario_id]);

    res.json({
      success: true,
      message: 'Contraseña actualizada exitosamente.'
    });

  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    res.status(500).json({
      success: false,
      message: 'Error en el servidor.'
    });
  }
};
