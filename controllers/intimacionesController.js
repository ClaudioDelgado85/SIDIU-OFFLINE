// controllers/intimacionesController.js
// Controlador para gestión de intimaciones

const db = require('../config/database');

// Función para calcular el estado automáticamente
function calcularEstadoAutomatico(intimacion) {
  // Si ya dio cumplimiento, el estado es "cumplida"
  if (intimacion.dio_cumplimiento) {
    return 'cumplida';
  }

  // Calcular fecha de vencimiento
  const fechaIntimacion = new Date(intimacion.fecha);
  const plazo = intimacion.plazo_dias || 0;
  const fechaVencimiento = new Date(fechaIntimacion);
  fechaVencimiento.setDate(fechaVencimiento.getDate() + plazo);

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0); // Normalizar a medianoche
  fechaVencimiento.setHours(0, 0, 0, 0);

  // Calcular diferencia en días
  const diffTime = fechaVencimiento - hoy;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return 'vencida'; // Ya pasó la fecha de vencimiento
  } else if (diffDays <= 3) {
    return 'proxima_vencer'; // Faltan 3 días o menos
  } else {
    return 'vigente'; // Aún tiene tiempo
  }
}

// Obtener todas las intimaciones (con filtros y paginación)
exports.obtenerIntimaciones = async (req, res) => {
  try {
    const { tipo, estado, numero, dni, nombre, fecha_desde, fecha_hasta, busqueda, page, limit } = req.query;

    // Configuración de paginación
    const currentPage = parseInt(page) || 1;
    const recordsPerPage = parseInt(limit) || 10;
    const offset = (currentPage - 1) * recordsPerPage;

    let whereClause = ' WHERE 1=1';
    const params = [];

    // Aplicar filtros
    if (tipo) {
      whereClause += ' AND tipo = ?';
      params.push(tipo);
    }

    if (numero) {
      whereClause += ' AND numero_intimacion = ?';
      params.push(numero);
    }

    // Nota: El filtro por estado se aplicará DESPUÉS de calcular el estado automático
    const filtroEstado = estado;

    if (fecha_desde) {
      whereClause += ' AND fecha >= ?';
      params.push(fecha_desde);
    }

    if (fecha_hasta) {
      whereClause += ' AND fecha <= ?';
      params.push(fecha_hasta);
    }

    // Búsqueda general
    if (busqueda) {
      whereClause += ' AND (dni LIKE ? OR nombre_apellido LIKE ? OR direccion LIKE ?)';
      params.push(`%${busqueda}%`, `%${busqueda}%`, `%${busqueda}%`);
    }

    // Filtros específicos
    if (dni && !busqueda) {
      whereClause += ' AND dni LIKE ?';
      params.push(`%${dni}%`);
    }

    if (nombre && !busqueda) {
      whereClause += ' AND nombre_apellido LIKE ?';
      params.push(`%${nombre}%`);
    }

    // Query principal SIN paginación para poder filtrar por estado calculado
    let sql = 'SELECT * FROM intimaciones' + whereClause;
    sql += ' ORDER BY fecha DESC, id DESC';

    const [allIntimaciones] = await db.pool.execute(sql, params);

    // Calcular estado automático para cada intimación
    const intimacionesConEstado = allIntimaciones.map(item => ({
      ...item,
      estado: calcularEstadoAutomatico(item),
      fecha_vencimiento: new Date(new Date(item.fecha).getTime() + (item.plazo_dias || 0) * 24 * 60 * 60 * 1000)
    }));

    // Aplicar filtro de estado si se especificó
    let intimacionesFiltradas = intimacionesConEstado;
    if (filtroEstado) {
      intimacionesFiltradas = intimacionesConEstado.filter(i => i.estado === filtroEstado);
    }

    // Calcular estadísticas
    const stats = {
      total: intimacionesFiltradas.length,
      vigentes: intimacionesFiltradas.filter(i => i.estado === 'vigente').length,
      proximas_vencer: intimacionesFiltradas.filter(i => i.estado === 'proxima_vencer').length,
      vencidas: intimacionesFiltradas.filter(i => i.estado === 'vencida').length,
      cumplidas: intimacionesFiltradas.filter(i => i.estado === 'cumplida').length
    };

    // Aplicar paginación manualmente
    const totalRecords = intimacionesFiltradas.length;
    const totalPages = Math.ceil(totalRecords / recordsPerPage);
    const paginatedData = intimacionesFiltradas.slice(offset, offset + recordsPerPage);

    res.json({
      success: true,
      data: paginatedData,
      stats,
      pagination: {
        currentPage,
        totalPages,
        totalRecords,
        recordsPerPage,
        hasNextPage: currentPage < totalPages,
        hasPrevPage: currentPage > 1
      }
    });

  } catch (error) {
    console.error('Error al obtener intimaciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener intimaciones.'
    });
  }
};

// Crear nueva intimación
exports.crearIntimacion = async (req, res) => {
  try {
    const {
      fecha, tipo, nombre_apellido, dni, direccion, tipo_obstruccion,
      plazo_dias, numero_intimacion, observaciones, barrio_id,
      // Campos Baldíos
      infraccion_realizada, numero_infraccion, fecha_infraccion, propietario_no_ubicado,
      // Campos Vehículos
      marca, modelo, color, dominio, fecha_retiro, lugar_deposito
    } = req.body;

    // Validar campos obligatorios comunes
    if (!fecha || !tipo || !nombre_apellido || !dni || !direccion) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos obligatorios (fecha, tipo, nombre, dni, dirección).'
      });
    }

    // Calcular estado inicial (vigente por defecto)
    const estado = 'vigente';

    const sql = `
      INSERT INTO intimaciones (
        fecha, tipo, nombre_apellido, dni, direccion, tipo_obstruccion,
        plazo_dias, numero_intimacion, observaciones, estado,
        infraccion_realizada, numero_infraccion, fecha_infraccion, propietario_no_ubicado,
        marca, modelo, color, dominio, fecha_retiro, lugar_deposito, barrio_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      fecha, tipo, nombre_apellido, dni, direccion, tipo_obstruccion || null,
      plazo_dias || 0, numero_intimacion || 1, observaciones || null, estado,
      infraccion_realizada || false, numero_infraccion || null, fecha_infraccion || null, propietario_no_ubicado || false,
      marca || null, modelo || null, color || null, dominio || null, fecha_retiro || null, lugar_deposito || null,
      barrio_id || null
    ];

    const [result] = await db.pool.execute(sql, values);

    res.status(201).json({
      success: true,
      message: 'Intimación creada exitosamente.',
      data: { id: result.insertId, ...req.body, estado }
    });

  } catch (error) {
    console.error('Error al crear intimación:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear intimación.'
    });
  }
};

// Actualizar intimación
exports.actualizarIntimacion = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Validar existencia
    const [exists] = await db.pool.execute('SELECT id FROM intimaciones WHERE id = ?', [id]);
    if (exists.length === 0) {
      return res.status(404).json({ success: false, message: 'Intimación no encontrada.' });
    }

    // Construir query dinámica
    const allowedFields = [
      'fecha', 'tipo', 'nombre_apellido', 'dni', 'direccion', 'tipo_obstruccion',
      'plazo_dias', 'numero_intimacion', 'observaciones', 'estado', 'dio_cumplimiento', 'fecha_subsanacion',
      'infraccion_realizada', 'numero_infraccion', 'fecha_infraccion', 'propietario_no_ubicado',
      'marca', 'modelo', 'color', 'dominio', 'fecha_retiro', 'lugar_deposito', 'barrio_id'
    ];

    const fields = [];
    const values = [];

    for (const key of Object.keys(updates)) {
      if (allowedFields.includes(key)) {
        fields.push(`${key} = ?`);
        values.push(updates[key]);
      }
    }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: 'No hay campos para actualizar.' });
    }

    // Actualizar estado automáticamente si se da cumplimiento
    if (updates.dio_cumplimiento === true || updates.dio_cumplimiento === '1') {
      // Si se marca cumplimiento, actualizar estado a cumplida y fecha subsanacion hoy si no viene
      if (!fields.includes('estado = ?')) {
        fields.push('estado = ?');
        values.push('cumplida');
      }
      if (!fields.includes('fecha_subsanacion = ?') && !updates.fecha_subsanacion) {
        fields.push('fecha_subsanacion = ?');
        values.push(new Date());
      }
    }

    values.push(id);
    const sql = `UPDATE intimaciones SET ${fields.join(', ')} WHERE id = ?`;

    await db.pool.execute(sql, values);

    res.json({
      success: true,
      message: 'Intimación actualizada exitosamente.'
    });

  } catch (error) {
    console.error('Error al actualizar intimación:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar intimación.'
    });
  }
};

// Eliminar intimación
exports.eliminarIntimacion = async (req, res) => {
  try {
    const { id } = req.params;

    // Validar existencia
    const [exists] = await db.pool.execute('SELECT id FROM intimaciones WHERE id = ?', [id]);
    if (exists.length === 0) {
      return res.status(404).json({ success: false, message: 'Intimación no encontrada.' });
    }

    await db.pool.execute('DELETE FROM intimaciones WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Intimación eliminada correctamente.'
    });
  } catch (error) {
    console.error('Error al eliminar intimación:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar intimación.'
    });
  }
};

// ==========================================
// OBTENER INTIMACIÓN POR ID
// ==========================================
exports.obtenerIntimacionPorId = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.pool.execute('SELECT * FROM intimaciones WHERE id = ?', [id]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Intimación no encontrada' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('Error obtenerIntimacionPorId:', error);
    res.status(500).json({ success: false, message: 'Error al obtener intimación' });
  }
};
