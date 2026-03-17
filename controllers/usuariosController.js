// controllers/usuariosController.js
// Controlador para gestión de usuarios (solo admin)

const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { registrarAuditoria } = require('../middleware/auditoria');
const { MODULOS_VALIDOS } = require('../middleware/auth');

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

// Obtener un usuario por ID (incluye sus permisos)
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

    // Obtener permisos de módulos
    const [permisos] = await db.pool.execute(
      'SELECT modulo, habilitado FROM permisos_modulos WHERE usuario_id = ?',
      [id]
    );

    const permisosMap = {};
    permisos.forEach(p => {
      permisosMap[p.modulo] = p.habilitado === 1;
    });

    res.json({
      success: true,
      data: {
        ...usuarios[0],
        permisos: permisosMap
      }
    });
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener usuario.'
    });
  }
};

// Crear nuevo usuario (con permisos de módulos opcionales)
exports.crearUsuario = async (req, res) => {
  try {
    const { nombre_completo, usuario, email, password, rol, permisos } = req.body;

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

    const nuevoId = result.insertId;

    // Si es usuario de carga y se enviaron permisos, guardarlos
    if (rol === 'carga' && permisos && typeof permisos === 'object') {
      await guardarPermisos(nuevoId, permisos);
    }

    // Registrar en auditoría
    await registrarAuditoria({
      usuario_id: req.usuario.id,
      usuario_nombre: req.usuario.nombre_completo,
      accion: 'crear',
      modulo: 'usuarios',
      registro_id: nuevoId,
      descripcion: `Creó usuario "${usuario}" con rol "${rol}"`,
      datos_nuevos: { nombre_completo, usuario, email, rol, permisos },
      ip: req.ip
    });

    res.status(201).json({
      success: true,
      message: 'Usuario creado exitosamente.',
      data: {
        id: nuevoId,
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
    const { nombre_completo, email, rol, activo, permisos } = req.body;

    // Validar que el usuario existe
    const checkSql = 'SELECT id, rol FROM usuarios WHERE id = ?';
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

    if (campos.length === 0 && !permisos) {
      return res.status(400).json({
        success: false,
        message: 'No se proporcionaron campos para actualizar.'
      });
    }

    if (campos.length > 0) {
      valores.push(id);
      const sql = `UPDATE usuarios SET ${campos.join(', ')} WHERE id = ?`;
      await db.pool.execute(sql, valores);
    }

    // Actualizar permisos si se enviaron
    const rolFinal = rol || usuarios[0].rol;
    if (rolFinal === 'carga' && permisos && typeof permisos === 'object') {
      await guardarPermisos(id, permisos);
    }

    // Si el rol cambió y ya no es 'carga', limpiar permisos
    if (rol && rol !== 'carga') {
      await db.pool.execute('DELETE FROM permisos_modulos WHERE usuario_id = ?', [id]);
    }

    // Registrar en auditoría
    await registrarAuditoria({
      usuario_id: req.usuario.id,
      usuario_nombre: req.usuario.nombre_completo,
      accion: 'editar',
      modulo: 'usuarios',
      registro_id: parseInt(id),
      descripcion: `Actualizó usuario ID ${id}`,
      datos_nuevos: { nombre_completo, email, rol, activo, permisos },
      ip: req.ip
    });

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

    // Registrar en auditoría
    await registrarAuditoria({
      usuario_id: req.usuario.id,
      usuario_nombre: req.usuario.nombre_completo,
      accion: 'eliminar',
      modulo: 'usuarios',
      registro_id: parseInt(id),
      descripcion: `Desactivó usuario ID ${id}`,
      ip: req.ip
    });

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

    // Registrar en auditoría
    await registrarAuditoria({
      usuario_id: req.usuario.id,
      usuario_nombre: req.usuario.nombre_completo,
      accion: 'editar',
      modulo: 'usuarios',
      registro_id: parseInt(id),
      descripcion: `Reseteó contraseña de usuario ID ${id}`,
      ip: req.ip
    });

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

// Obtener permisos de un usuario
exports.obtenerPermisos = async (req, res) => {
  try {
    const { id } = req.params;

    const [permisos] = await db.pool.execute(
      'SELECT modulo, habilitado FROM permisos_modulos WHERE usuario_id = ?',
      [id]
    );

    const permisosMap = {};
    // Inicializar todos los módulos como habilitados por defecto
    MODULOS_VALIDOS.forEach(m => { permisosMap[m] = true; });
    // Sobreescribir con los registros de la base
    permisos.forEach(p => {
      permisosMap[p.modulo] = p.habilitado === 1;
    });

    res.json({
      success: true,
      data: permisosMap,
      modulos_disponibles: MODULOS_VALIDOS
    });
  } catch (error) {
    console.error('Error al obtener permisos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener permisos.'
    });
  }
};

// Actualizar permisos de un usuario
exports.actualizarPermisos = async (req, res) => {
  try {
    const { id } = req.params;
    const { permisos } = req.body;

    if (!permisos || typeof permisos !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Los permisos son requeridos.'
      });
    }

    // Verificar que el usuario existe y es de tipo carga
    const [usuarios] = await db.pool.execute(
      'SELECT id, rol FROM usuarios WHERE id = ?',
      [id]
    );

    if (usuarios.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado.'
      });
    }

    if (usuarios[0].rol !== 'carga') {
      return res.status(400).json({
        success: false,
        message: 'Los permisos de módulo solo aplican a usuarios con rol "carga".'
      });
    }

    await guardarPermisos(id, permisos);

    // Registrar en auditoría
    await registrarAuditoria({
      usuario_id: req.usuario.id,
      usuario_nombre: req.usuario.nombre_completo,
      accion: 'editar',
      modulo: 'usuarios',
      registro_id: parseInt(id),
      descripcion: `Actualizó permisos de módulos para usuario ID ${id}`,
      datos_nuevos: permisos,
      ip: req.ip
    });

    res.json({
      success: true,
      message: 'Permisos actualizados exitosamente.'
    });
  } catch (error) {
    console.error('Error al actualizar permisos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar permisos.'
    });
  }
};

// ============================================
// Función auxiliar para guardar permisos
// ============================================
async function guardarPermisos(usuarioId, permisos) {
  // Eliminar permisos existentes
  await db.pool.execute('DELETE FROM permisos_modulos WHERE usuario_id = ?', [usuarioId]);

  // Insertar nuevos permisos
  for (const modulo of MODULOS_VALIDOS) {
    if (permisos.hasOwnProperty(modulo)) {
      const habilitado = permisos[modulo] ? 1 : 0;
      await db.pool.execute(
        'INSERT INTO permisos_modulos (usuario_id, modulo, habilitado) VALUES (?, ?, ?)',
        [usuarioId, modulo, habilitado]
      );
    }
  }
}
