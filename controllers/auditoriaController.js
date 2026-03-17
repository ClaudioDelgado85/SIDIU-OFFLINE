// controllers/auditoriaController.js
// Controlador para consulta de auditoría (solo admin)

const db = require('../config/database');

// Obtener registros de auditoría con filtros y paginación
exports.obtenerRegistros = async (req, res) => {
  try {
    const {
      usuario_id,
      modulo,
      accion,
      fecha_desde,
      fecha_hasta,
      pagina = 1,
      limite = 50
    } = req.query;

    let where = [];
    let params = [];

    if (usuario_id) {
      where.push('a.usuario_id = ?');
      params.push(usuario_id);
    }
    if (modulo) {
      where.push('a.modulo = ?');
      params.push(modulo);
    }
    if (accion) {
      where.push('a.accion = ?');
      params.push(accion);
    }
    if (fecha_desde) {
      where.push('a.fecha >= ?');
      params.push(fecha_desde);
    }
    if (fecha_hasta) {
      where.push('a.fecha <= ?');
      params.push(fecha_hasta + ' 23:59:59');
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
    const offset = (parseInt(pagina) - 1) * parseInt(limite);

    // Contar total de registros
    const [countResult] = await db.pool.execute(
      `SELECT COUNT(*) as total FROM auditoria a ${whereClause}`,
      params
    );
    const total = countResult[0].total;

    // Obtener registros paginados
    const sql = `
      SELECT a.id, a.usuario_id, a.usuario_nombre, a.accion, a.modulo, 
             a.registro_id, a.descripcion, a.ip_address, a.fecha
      FROM auditoria a
      ${whereClause}
      ORDER BY a.fecha DESC
      LIMIT ${parseInt(limite)} OFFSET ${offset}
    `;
    const [registros] = await db.pool.execute(sql, params);

    res.json({
      success: true,
      data: registros,
      paginacion: {
        total,
        pagina: parseInt(pagina),
        limite: parseInt(limite),
        total_paginas: Math.ceil(total / parseInt(limite))
      }
    });
  } catch (error) {
    console.error('Error al obtener auditoría:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener registros de auditoría.'
    });
  }
};

// Obtener detalle de un registro (incluye datos_anteriores y datos_nuevos)
exports.obtenerDetalle = async (req, res) => {
  try {
    const { id } = req.params;
    const [registros] = await db.pool.execute(
      'SELECT * FROM auditoria WHERE id = ?',
      [id]
    );

    if (registros.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Registro de auditoría no encontrado.'
      });
    }

    res.json({
      success: true,
      data: registros[0]
    });
  } catch (error) {
    console.error('Error al obtener detalle de auditoría:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener detalle.'
    });
  }
};

// Resumen de actividad (estadísticas)
exports.obtenerResumen = async (req, res) => {
  try {
    const { fecha_desde, fecha_hasta } = req.query;

    let dateFilter = '';
    let params = [];
    if (fecha_desde && fecha_hasta) {
      dateFilter = 'WHERE fecha >= ? AND fecha <= ?';
      params = [fecha_desde, fecha_hasta + ' 23:59:59'];
    } else {
      // Último mes por defecto
      dateFilter = 'WHERE fecha >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
    }

    // Acciones por usuario
    const [porUsuario] = await db.pool.execute(
      `SELECT usuario_nombre, COUNT(*) as total 
       FROM auditoria ${dateFilter}
       GROUP BY usuario_id, usuario_nombre 
       ORDER BY total DESC`,
      params
    );

    // Acciones por módulo
    const [porModulo] = await db.pool.execute(
      `SELECT modulo, COUNT(*) as total 
       FROM auditoria ${dateFilter}
       GROUP BY modulo 
       ORDER BY total DESC`,
      params
    );

    // Acciones por tipo
    const [porAccion] = await db.pool.execute(
      `SELECT accion, COUNT(*) as total 
       FROM auditoria ${dateFilter}
       GROUP BY accion 
       ORDER BY total DESC`,
      params
    );

    // Actividad por día (últimos 30 días)
    const [porDia] = await db.pool.execute(
      `SELECT DATE(fecha) as dia, COUNT(*) as total 
       FROM auditoria ${dateFilter}
       GROUP BY DATE(fecha) 
       ORDER BY dia DESC 
       LIMIT 30`,
      params
    );

    // Total general
    const [totalResult] = await db.pool.execute(
      `SELECT COUNT(*) as total FROM auditoria ${dateFilter}`,
      params
    );

    res.json({
      success: true,
      data: {
        total: totalResult[0].total,
        por_usuario: porUsuario,
        por_modulo: porModulo,
        por_accion: porAccion,
        por_dia: porDia
      }
    });
  } catch (error) {
    console.error('Error al obtener resumen de auditoría:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener resumen.'
    });
  }
};
