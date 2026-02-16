// controllers/usuariosController.js
// Controlador para gestión de usuarios (solo admin)

const bcrypt = require('bcryptjs');
const db = require('../config/database');

// Obtener todos los usuarios
exports.obtenerUsuarios = async (req, res) => {
  try {
    const sql = 'SELECT id, nombre_completo, usuario, email, rol, activo, fecha_creacion FROM usuarios ORDER BY nombre_completo';
    const [usuarios] = await db.pool.execute(sql);

    res.json({
      success: true,
      data: usuarios
    });
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener usuarios.'
    });
  }
};

// Obtener un usuario por ID
exports.obtenerUsuarioPorId = async (req, res) => {
  try {
    const { id } = req.params;
    const sql = 'SELECT id, nombre_completo, usuario, email, rol, activo, fecha_creacion FROM usuarios WHERE id = ?';
    const [usuarios] = await db.pool.execute(sql, [id]);

    if (usuarios.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado.'
      });
    }

    res.json({
      success: true,
      data: usuarios[0]
    });
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener usuario.'
    });
  }
};

// Crear nuevo usuario
exports.crearUsuario = async (req, res) => {
  try {
    const { nombre_completo, usuario, email, password, rol } = req.body;

    // Validar datos
    if (!nombre_completo || !usuario || !email || !password || !rol) {
      return res.status(400).json({
        success: false,
        message: 'Todos los campos son requeridos.'
      });
    }

    // Validar rol
    const rolesValidos = ['admin_total', 'carga', 'consulta'];
    if (!rolesValidos.includes(rol)) {
      return res.status(400).json({
        success: false,
        message: 'Rol inválido.'
      });
    }

    // Verificar si el usuario ya existe
    const checkSql = 'SELECT id FROM usuarios WHERE usuario = ? OR email = ?';
    const [existentes] = await db.pool.execute(checkSql, [usuario, email]);

    if (existentes.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'El usuario o email ya existe.'
      });
    }

    // Hash de contraseña
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Insertar usuario
    const sql = 'INSERT INTO usuarios (nombre_completo, usuario, email, password_hash, rol) VALUES (?, ?, ?, ?, ?)';
    const [result] = await db.pool.execute(sql, [nombre_completo, usuario, email, password_hash, rol]);

    res.status(201).json({
      success: true,
      message: 'Usuario creado exitosamente.',
      data: {
        id: result.insertId,
        nombre_completo,
        usuario,
        email,
        rol
      }
    });
  } catch (error) {
    console.error('Error al crear usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear usuario.'
    });
  }
};

// Actualizar usuario
exports.actualizarUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre_completo, email, rol, activo } = req.body;

    // Validar que el usuario existe
    const checkSql = 'SELECT id FROM usuarios WHERE id = ?';
    const [usuarios] = await db.pool.execute(checkSql, [id]);

    if (usuarios.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado.'
      });
    }

    // Validar rol si se proporciona
    if (rol) {
      const rolesValidos = ['admin_total', 'carga', 'consulta'];
      if (!rolesValidos.includes(rol)) {
        return res.status(400).json({
          success: false,
          message: 'Rol inválido.'
        });
      }
    }

    // Construir query de actualización
    const campos = [];
    const valores = [];

    if (nombre_completo) {
      campos.push('nombre_completo = ?');
      valores.push(nombre_completo);
    }
    if (email) {
      campos.push('email = ?');
      valores.push(email);
    }
    if (rol) {
      campos.push('rol = ?');
      valores.push(rol);
    }
    if (activo !== undefined) {
      campos.push('activo = ?');
      valores.push(activo);
    }

    if (campos.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No se proporcionaron campos para actualizar.'
      });
    }

    valores.push(id);
    const sql = `UPDATE usuarios SET ${campos.join(', ')} WHERE id = ?`;
    await db.pool.execute(sql, valores);

    res.json({
      success: true,
      message: 'Usuario actualizado exitosamente.'
    });
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar usuario.'
    });
  }
};

// Eliminar usuario (desactivar)
exports.eliminarUsuario = async (req, res) => {
  try {
    const { id } = req.params;

    // No permitir eliminar al propio usuario
    if (parseInt(id) === req.usuario.id) {
      return res.status(400).json({
        success: false,
        message: 'No puedes desactivar tu propia cuenta.'
      });
    }

    const sql = 'UPDATE usuarios SET activo = false WHERE id = ?';
    const [result] = await db.pool.execute(sql, [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado.'
      });
    }

    res.json({
      success: true,
      message: 'Usuario desactivado exitosamente.'
    });
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar usuario.'
    });
  }
};

// Resetear contraseña de usuario
exports.resetearPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { nueva_password } = req.body;

    if (!nueva_password || nueva_password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'La contraseña debe tener al menos 6 caracteres.'
      });
    }

    // Hash de contraseña
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(nueva_password, salt);

    const sql = 'UPDATE usuarios SET password_hash = ? WHERE id = ?';
    const [result] = await db.pool.execute(sql, [password_hash, id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado.'
      });
    }

    res.json({
      success: true,
      message: 'Contraseña reseteada exitosamente.'
    });
  } catch (error) {
    console.error('Error al resetear contraseña:', error);
    res.status(500).json({
      success: false,
      message: 'Error al resetear contraseña.'
    });
  }
};
