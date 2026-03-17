// middleware/auditoria.js
// Servicio de registro de auditoría

const db = require('../config/database');

/**
 * Registra una acción en la tabla de auditoría.
 * @param {Object} params
 * @param {number} params.usuario_id - ID del usuario que realizó la acción
 * @param {string} params.usuario_nombre - Nombre completo del usuario
 * @param {'crear'|'editar'|'eliminar'|'login'|'logout'|'cambio_estado'} params.accion
 * @param {string} params.modulo - Módulo afectado (expedientes, intimaciones, etc.)
 * @param {number|null} params.registro_id - ID del registro afectado (null para login/logout)
 * @param {string} params.descripcion - Descripción legible de la acción
 * @param {Object|null} params.datos_anteriores - Estado previo del registro (para ediciones)
 * @param {Object|null} params.datos_nuevos - Estado nuevo del registro
 * @param {string|null} params.ip - Dirección IP del cliente
 */
async function registrarAuditoria({ usuario_id, usuario_nombre, accion, modulo, registro_id = null, descripcion = '', datos_anteriores = null, datos_nuevos = null, ip = null }) {
  try {
    const sql = `INSERT INTO auditoria (usuario_id, usuario_nombre, accion, modulo, registro_id, descripcion, datos_anteriores, datos_nuevos, ip_address) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
    await db.pool.execute(sql, [
      usuario_id,
      usuario_nombre || null,
      accion,
      modulo,
      registro_id,
      descripcion,
      datos_anteriores ? JSON.stringify(datos_anteriores) : null,
      datos_nuevos ? JSON.stringify(datos_nuevos) : null,
      ip || null
    ]);
  } catch (error) {
    // No lanzar error para no bloquear la operación principal
    console.error('Error al registrar auditoría:', error.message);
  }
}

module.exports = { registrarAuditoria };
