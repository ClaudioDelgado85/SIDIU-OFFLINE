// controllers/expedientesController.js
// Controlador para gestión de expedientes

const db = require('../config/database');

// Obtener todos los expedientes (con filtros opcionales y paginación)
exports.obtenerExpedientes = async (req, res) => {
  try {
    const { estado, motivo, fecha_desde, fecha_hasta, dni, nombre, numero_expediente, busqueda, page, limit } = req.query;

    // Configuración de paginación
    const currentPage = parseInt(page) || 1;
    const recordsPerPage = parseInt(limit) || 10;
    const offset = (currentPage - 1) * recordsPerPage;

    let whereClause = ' WHERE 1=1';
    const params = [];

    // Aplicar filtros si existen
    if (estado) {
      whereClause += ' AND estado = ?';
      params.push(estado);
    }

    if (motivo) {
      if (motivo === 'otros') {
        whereClause += ' AND (motivo LIKE ? OR motivo NOT IN (?,?,?,?,?,?,?,?,?,?))';
        params.push('Otros:%', 'habilitacion', 'reempadronamiento', 'ampliacion_rubro', 'cambio_rubro', 'traslado_local', 'cambio_titular', 'cancelacion', 'reclamos', 'aprobacion_plano', 'oficio_juzgado');
      } else {
        whereClause += ' AND motivo = ?';
        params.push(motivo);
      }
    }

    if (fecha_desde) {
      whereClause += ' AND fecha >= ?';
      params.push(fecha_desde);
    }

    if (fecha_hasta) {
      whereClause += ' AND fecha <= ?';
      params.push(fecha_hasta);
    }

    // Búsqueda general (busca en múltiples campos con OR)
    if (busqueda) {
      whereClause += ' AND (dni LIKE ? OR nombre_apellido LIKE ? OR numero_expediente LIKE ?)';
      params.push(`%${busqueda}%`, `%${busqueda}%`, `%${busqueda}%`);
    }

    // Filtros específicos individuales (para uso directo)
    if (dni && !busqueda) {
      whereClause += ' AND dni LIKE ?';
      params.push(`%${dni}%`);
    }

    if (nombre && !busqueda) {
      whereClause += ' AND nombre_apellido LIKE ?';
      params.push(`%${nombre}%`);
    }

    if (numero_expediente && !busqueda) {
      whereClause += ' AND numero_expediente LIKE ?';
      params.push(`%${numero_expediente}%`);
    }

    // Query para contar el total de registros (para paginación)
    const countSql = 'SELECT COUNT(*) as total FROM expedientes' + whereClause;
    const [countResult] = await db.pool.execute(countSql, params);
    const totalRecords = countResult[0].total;
    const totalPages = Math.ceil(totalRecords / recordsPerPage);

    // Query principal con paginación
    let sql = 'SELECT * FROM expedientes' + whereClause;
    sql += ' ORDER BY fecha DESC, id DESC';
    sql += ` LIMIT ${parseInt(recordsPerPage)} OFFSET ${parseInt(offset)}`;

    const [expedientes] = await db.pool.execute(sql, params);

    res.json({
      success: true,
      data: expedientes,
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
    console.error('Error al obtener expedientes:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener expedientes.'
    });
  }
};

// Obtener un expediente por ID
exports.obtenerExpedientePorId = async (req, res) => {
  try {
    const { id } = req.params;

    const sql = 'SELECT * FROM expedientes WHERE id = ?';
    const [expedientes] = await db.pool.execute(sql, [id]);

    if (expedientes.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Expediente no encontrado.'
      });
    }

    res.json({
      success: true,
      data: expedientes[0]
    });

  } catch (error) {
    console.error('Error al obtener expediente:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener expediente.'
    });
  }
};

// Crear nuevo expediente
exports.crearExpediente = async (req, res) => {
  console.log('--- Intentando crear expediente ---');
  console.log('Datos recibidos:', req.body);
  console.log('Usuario:', req.usuario);

  try {
    const { fecha, numero_expediente, nombre_apellido, dni, motivo, estado, barrio_id } = req.body;

    // Validar campos requeridos
    if (!fecha || !numero_expediente || !nombre_apellido || !dni || !motivo) {
      console.log('❌ Faltan campos requeridos');
      return res.status(400).json({
        success: false,
        message: 'Todos los campos son requeridos.'
      });
    }

    // Validar que el número de expediente no exista
    const checkSql = 'SELECT id FROM expedientes WHERE numero_expediente = ?';
    const [existentes] = await db.pool.execute(checkSql, [numero_expediente]);

    if (existentes.length > 0) {
      console.log('❌ Número de expediente duplicado:', numero_expediente);
      return res.status(400).json({
        success: false,
        message: 'El número de expediente ya existe.'
      });
    }

    // Validar estado
    const estadosValidos = ['ingreso', 'en_inspeccion', 'plazo_otorgado', 'salida'];
    const estadoFinal = estado && estadosValidos.includes(estado) ? estado : 'ingreso';

    // Extraer campos opcionales del nuevo flujo
    const { fecha_inspeccion, plazo_dias, fecha_salida, observaciones, direccion, numero_partida } = req.body;

    // Insertar expediente
    const sql = `
      INSERT INTO expedientes (fecha, numero_expediente, nombre_apellido, dni, motivo, direccion, numero_partida, estado, barrio_id, fecha_inspeccion, plazo_dias, fecha_salida, observaciones)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    console.log('Ejecutando INSERT...');
    const [result] = await db.pool.execute(sql, [
      fecha,
      numero_expediente,
      nombre_apellido,
      dni,
      motivo,
      direccion || null,
      numero_partida || null,
      estadoFinal,
      barrio_id || null,
      fecha_inspeccion || null,
      plazo_dias || null,
      fecha_salida || null,
      observaciones || null
    ]);

    console.log('✅ Expediente creado con ID:', result.insertId);

    res.status(201).json({
      success: true,
      message: 'Expediente creado exitosamente.',
      data: {
        id: result.insertId,
        fecha,
        numero_expediente,
        nombre_apellido,
        dni,
        motivo,
        estado: estadoFinal
      }
    });

  } catch (error) {
    console.error('❌ Error CRÍTICO al crear expediente:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear expediente: ' + error.message
    });
  }
};

// Actualizar expediente
exports.actualizarExpediente = async (req, res) => {
  try {
    const { id } = req.params;
    const { fecha, numero_expediente, nombre_apellido, dni, motivo, estado, barrio_id } = req.body;

    // Verificar que el expediente existe
    const checkSql = 'SELECT id, numero_expediente FROM expedientes WHERE id = ?';
    const [expedientes] = await db.pool.execute(checkSql, [id]);

    if (expedientes.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Expediente no encontrado.'
      });
    }

    // Si se cambia el número de expediente, verificar que no exista
    if (numero_expediente && numero_expediente !== expedientes[0].numero_expediente) {
      const checkNumSql = 'SELECT id FROM expedientes WHERE numero_expediente = ? AND id != ?';
      const [existentes] = await db.pool.execute(checkNumSql, [numero_expediente, id]);

      if (existentes.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'El número de expediente ya existe.'
        });
      }
    }

    // Construir query de actualización
    const campos = [];
    const valores = [];

    if (fecha) {
      campos.push('fecha = ?');
      valores.push(fecha);
    }
    if (numero_expediente) {
      campos.push('numero_expediente = ?');
      valores.push(numero_expediente);
    }
    if (nombre_apellido) {
      campos.push('nombre_apellido = ?');
      valores.push(nombre_apellido);
    }
    if (dni) {
      campos.push('dni = ?');
      valores.push(dni);
    }
    if (motivo) {
      campos.push('motivo = ?');
      valores.push(motivo);
    }
    if (estado) {
      const estadosValidos = ['ingreso', 'en_inspeccion', 'plazo_otorgado', 'salida'];
      if (estadosValidos.includes(estado)) {
        campos.push('estado = ?');
        valores.push(estado);
      }
    }
    if (barrio_id !== undefined) {
      campos.push('barrio_id = ?');
      valores.push(barrio_id || null);
    }

    // Campos del nuevo flujo de expedientes
    const { fecha_inspeccion, plazo_dias, fecha_salida, observaciones, direccion, numero_partida } = req.body;
    if (fecha_inspeccion !== undefined) {
      campos.push('fecha_inspeccion = ?');
      valores.push(fecha_inspeccion || null);
    }
    if (plazo_dias !== undefined) {
      campos.push('plazo_dias = ?');
      valores.push(plazo_dias || null);
    }
    if (fecha_salida !== undefined) {
      campos.push('fecha_salida = ?');
      valores.push(fecha_salida || null);
    }
    if (observaciones !== undefined) {
      campos.push('observaciones = ?');
      valores.push(observaciones || null);
    }
    if (direccion !== undefined) {
      campos.push('direccion = ?');
      valores.push(direccion || null);
    }
    if (numero_partida !== undefined) {
      campos.push('numero_partida = ?');
      valores.push(numero_partida || null);
    }

    if (campos.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No se proporcionaron campos para actualizar.'
      });
    }

    valores.push(id);
    const sql = `UPDATE expedientes SET ${campos.join(', ')} WHERE id = ?`;

    await db.pool.execute(sql, valores);

    res.json({
      success: true,
      message: 'Expediente actualizado exitosamente.'
    });

  } catch (error) {
    console.error('Error al actualizar expediente:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar expediente.'
    });
  }
};

// Cambiar estado del expediente
exports.cambiarEstado = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    // Validar estado
    const estadosValidos = ['ingreso', 'en_inspeccion', 'plazo_otorgado', 'salida'];
    if (!estado || !estadosValidos.includes(estado)) {
      return res.status(400).json({
        success: false,
        message: 'Estado inválido. Valores permitidos: ingreso, en_inspeccion, plazo_otorgado, salida'
      });
    }

    // Verificar que el expediente existe
    const checkSql = 'SELECT id FROM expedientes WHERE id = ?';
    const [expedientes] = await db.pool.execute(checkSql, [id]);

    if (expedientes.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Expediente no encontrado.'
      });
    }

    // Actualizar estado
    const sql = 'UPDATE expedientes SET estado = ? WHERE id = ?';
    await db.pool.execute(sql, [estado, id]);

    res.json({
      success: true,
      message: 'Estado actualizado exitosamente.',
      data: { estado }
    });

  } catch (error) {
    console.error('Error al cambiar estado:', error);
    res.status(500).json({
      success: false,
      message: 'Error al cambiar estado.'
    });
  }
};

// Eliminar expediente
exports.eliminarExpediente = async (req, res) => {
  try {
    const { id } = req.params;

    const sql = 'DELETE FROM expedientes WHERE id = ?';
    const [result] = await db.pool.execute(sql, [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Expediente no encontrado.'
      });
    }

    res.json({
      success: true,
      message: 'Expediente eliminado exitosamente.'
    });

  } catch (error) {
    console.error('Error al eliminar expediente:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar expediente.'
    });
  }
};

// Obtener estadísticas de expedientes
exports.obtenerEstadisticas = async (req, res) => {
  try {
    // Total de expedientes
    const [total] = await db.pool.execute('SELECT COUNT(*) as total FROM expedientes');

    // Por estado
    const [porEstado] = await db.pool.execute(`
      SELECT estado, COUNT(*) as cantidad 
      FROM expedientes 
      GROUP BY estado
    `);

    // Por mes (últimos 6 meses)
    const [porMes] = await db.pool.execute(`
      SELECT 
        DATE_FORMAT(fecha, '%Y-%m') as mes,
        COUNT(*) as cantidad
      FROM expedientes
      WHERE fecha >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
      GROUP BY DATE_FORMAT(fecha, '%Y-%m')
      ORDER BY mes DESC
    `);

    res.json({
      success: true,
      data: {
        total: total[0].total,
        por_estado: porEstado,
        por_mes: porMes
      }
    });

  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas.'
    });
  }
};
