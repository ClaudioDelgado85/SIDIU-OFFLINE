// controllers/intimacionesController.js
// Controlador para gestión de intimaciones

const db = require('../config/database');

// Función para calcular el estado automáticamente
function calcularEstadoAutomatico(intimacion) {
  // Si fue infraccionada, respetar ese estado
  if (intimacion.estado === 'infraccionado') {
    return 'infraccionado';
  }

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
    let sql = 'SELECT i.*, c.label AS rubro_comercial_label FROM intimaciones i LEFT JOIN catalogos c ON c.categoria = \'rubro_comercial\' AND c.valor = i.rubro_comercial' + whereClause;
    sql += ' ORDER BY fecha DESC, id DESC';

    const [allIntimaciones] = await db.pool.execute(sql, params);

    // ── Determinar la última intimación por grupo DNI+dirección ──
    // Esto nos permite saber cuáles son "reiteradas" (las anteriores)
    // y cuál es la "activa" (la más reciente) que debe recalcular su estado.
    const [latestPerGroup] = await db.pool.execute(
      `SELECT MAX(id) as ultimo_id FROM intimaciones GROUP BY dni, direccion`
    );
    const latestIds = new Set(latestPerGroup.map(r => r.ultimo_id));

    // Calcular estado automático para cada intimación
    const intimacionesConEstado = allIntimaciones.map(item => {
      let estadoCalculado = calcularEstadoAutomatico(item);

      // Si NO es la última de su grupo DNI+dirección y no está cumplida/infraccionada,
      // entonces es "reiterada" (fue superada por una intimación más reciente)
      const esUltima = latestIds.has(item.id);
      if (!esUltima && estadoCalculado !== 'cumplida' && estadoCalculado !== 'infraccionado') {
        estadoCalculado = 'reiterada';
      }

      return {
        ...item,
        estado: estadoCalculado,
        fecha_vencimiento: new Date(new Date(item.fecha).getTime() + (item.plazo_dias || 0) * 24 * 60 * 60 * 1000)
      };
    });

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
      cumplidas: intimacionesFiltradas.filter(i => i.estado === 'cumplida').length,
      reiteradas: intimacionesFiltradas.filter(i => i.estado === 'reiterada').length,
      infraccionados: intimacionesFiltradas.filter(i => i.estado === 'infraccionado').length
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
      rubro_comercial,
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

    // Validar rubro comercial
    if (tipo === 'comercio' && !rubro_comercial) {
      return res.status(400).json({
        success: false,
        message: 'El rubro comercial es obligatorio para intimaciones de tipo Comercio.'
      });
    }

    // Validar infraccion_realizada + numero_infraccion
    const esInfraccionada = infraccion_realizada === true || infraccion_realizada === '1' || infraccion_realizada === 1;
    if (esInfraccionada && (!numero_infraccion || numero_infraccion.trim() === '')) {
      return res.status(400).json({
        success: false,
        message: 'Debe ingresar el número de infracción cuando marca "Infracción Realizada".'
      });
    }

    // Calcular estado inicial
    let estado = 'vigente';
    if (esInfraccionada && numero_infraccion && numero_infraccion.trim() !== '') {
      estado = 'infraccionado';
    }

    const sql = `
      INSERT INTO intimaciones (
        fecha, tipo, nombre_apellido, dni, direccion, tipo_obstruccion, rubro_comercial,
        plazo_dias, numero_intimacion, observaciones, estado,
        infraccion_realizada, numero_infraccion, fecha_infraccion, propietario_no_ubicado,
        marca, modelo, color, dominio, fecha_retiro, lugar_deposito, barrio_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      fecha, tipo, nombre_apellido, dni, direccion, tipo_obstruccion || null,
      rubro_comercial || null,
      plazo_dias || 0, numero_intimacion || 1, observaciones || null, estado,
      esInfraccionada || false, numero_infraccion || null,
      esInfraccionada ? (fecha_infraccion || new Date().toISOString().substring(0, 10)) : (fecha_infraccion || null),
      propietario_no_ubicado || false,
      marca || null, modelo || null, color || null, dominio || null, fecha_retiro || null, lugar_deposito || null,
      barrio_id || null
    ];

    const [result] = await db.pool.execute(sql, values);

    // ── Marcar intimaciones anteriores como 'reiterada' ──
    // Si existe otra intimación para el mismo DNI + dirección que no sea
    // cumplida ni ya reiterada, la marcamos como reiterada
    if (dni && direccion) {
      await db.pool.execute(
        `UPDATE intimaciones
         SET estado = 'reiterada'
         WHERE dni = ? AND direccion = ?
           AND id != ?
           AND estado NOT IN ('cumplida', 'reiterada')
           AND dio_cumplimiento = 0`,
        [dni, direccion, result.insertId]
      );
    }

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

    // Validar rubro comercial para tipo Comercio
    if (updates.tipo === 'comercio' && !updates.rubro_comercial) {
      return res.status(400).json({
        success: false,
        message: 'El rubro comercial es obligatorio para intimaciones de tipo Comercio.'
      });
    }

    // Si el tipo cambia de comercio a otro, limpiar rubro_comercial
    if (updates.tipo && updates.tipo !== 'comercio') {
      updates.rubro_comercial = null;
    }

    // Construir query dinámica
    const allowedFields = [
      'fecha', 'tipo', 'nombre_apellido', 'dni', 'direccion', 'tipo_obstruccion', 'rubro_comercial',
      'plazo_dias', 'numero_intimacion', 'observaciones', 'estado', 'dio_cumplimiento', 'fecha_subsanacion',
      'infraccion_realizada', 'numero_infraccion', 'fecha_infraccion', 'propietario_no_ubicado',
      'marca', 'modelo', 'color', 'dominio', 'fecha_retiro', 'lugar_deposito', 'barrio_id',
      'foto_inicial', 'foto_actual'
    ];

    const fields = [];
    const values = [];

    for (const key of Object.keys(updates)) {
      if (allowedFields.includes(key)) {
        fields.push(`${key} = ?`);
        
        // Convertir strings vacíos a null para evitar errores de MySQL (fechas, enteros, foráneas)
        let val = updates[key];
        if (val === '') {
          val = null;
        }
        
        values.push(val);
      }
    }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: 'No hay campos para actualizar.' });
    }

    // Actualizar estado automáticamente si se da cumplimiento
    if (updates.dio_cumplimiento === true || updates.dio_cumplimiento === '1') {
      if (!fields.includes('estado = ?')) {
        fields.push('estado = ?');
        values.push('cumplida');
      }
      if (!fields.includes('fecha_subsanacion = ?') && !updates.fecha_subsanacion) {
        fields.push('fecha_subsanacion = ?');
        values.push(new Date());
      }
    }

    // Actualizar estado a 'infraccionado' si se marca infraccion_realizada
    const esInfraccionada = updates.infraccion_realizada === true || updates.infraccion_realizada === '1' || updates.infraccion_realizada === 1;
    if (esInfraccionada) {
      const numInfr = updates.numero_infraccion;
      if (!numInfr || String(numInfr).trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'Debe ingresar el número de infracción cuando marca "Infracción Realizada".'
        });
      }
      // Auto-set estado a infraccionado (sobreescribe cumplida si ambos se marcan)
      const idxEstado = fields.indexOf('estado = ?');
      if (idxEstado >= 0) {
        values[idxEstado] = 'infraccionado';
      } else {
        fields.push('estado = ?');
        values.push('infraccionado');
      }
      // Auto-set fecha_infraccion si no viene
      if (!fields.includes('fecha_infraccion = ?') && !updates.fecha_infraccion) {
        fields.push('fecha_infraccion = ?');
        values.push(new Date().toISOString().substring(0, 10));
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

// ==========================================
// SUBIR FOTO
// ==========================================
exports.subirFoto = async (req, res) => {
  try {
    const { id, tipo } = req.params; // tipo puede ser 'inicial' o 'actual'

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No se subió ningún archivo.' });
    }

    if (tipo !== 'inicial' && tipo !== 'actual') {
      return res.status(400).json({ success: false, message: 'Tipo de foto inválido.' });
    }

    // El archivo ya fue guardado por multer
    const fileUrl = `/uploads/intimaciones/${req.file.filename}`;
    const campo = tipo === 'inicial' ? 'foto_inicial' : 'foto_actual';

    await db.pool.execute(`UPDATE intimaciones SET ${campo} = ? WHERE id = ?`, [fileUrl, id]);

    res.json({
      success: true,
      message: 'Foto subida exitosamente.',
      data: {
        url: fileUrl
      }
    });

  } catch (error) {
    console.error('Error al subir foto:', error);
    res.status(500).json({ success: false, message: 'Error al subir foto.' });
  }
};

// ==========================================
// ELIMINAR FOTO
// ==========================================
exports.eliminarFoto = async (req, res) => {
  try {
    const { id, tipo } = req.params;
    const fs = require('fs');
    const path = require('path');

    if (tipo !== 'inicial' && tipo !== 'actual') {
      return res.status(400).json({ success: false, message: 'Tipo de foto inválido.' });
    }

    const campo = tipo === 'inicial' ? 'foto_inicial' : 'foto_actual';

    // Obtener ruta actual
    const [rows] = await db.pool.execute(`SELECT ${campo} FROM intimaciones WHERE id = ?`, [id]);

    if (rows.length > 0 && rows[0][campo]) {
      const filePath = path.join(__dirname, '../public', rows[0][campo]);

      // Borrar archivo físico si existe
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      // Actualizar base de datos
      await db.pool.execute(`UPDATE intimaciones SET ${campo} = NULL WHERE id = ?`, [id]);
    }

    res.json({ success: true, message: 'Foto eliminada exitosamente.' });

  } catch (error) {
    console.error('Error al eliminar foto:', error);
    res.status(500).json({ success: false, message: 'Error al eliminar foto.' });
  }
};
