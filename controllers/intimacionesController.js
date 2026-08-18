// controllers/intimacionesController.js
// Controlador para gestión de intimaciones

const db = require('../config/database');
const { titleCase, upper, normalizarDni, normalizarObstruccion, normalizarDireccionParaGrupo, normalizarNombreParaGrupo } = require('../utils/normalizarTexto');

// Genera un grupo_id único con formato GRP-YYYYMM-XXXX (XXXX aleatorio).
// Verifica contra la BD y reintenta hasta 5 veces si colisiona.
async function generarGrupoId(fechaStr) {
  const d = fechaStr ? new Date(fechaStr) : new Date();
  const yyyymm = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
  let gid, colisiona = true, intentos = 0;
  do {
    gid = `GRP-${yyyymm}-${Math.floor(1000 + Math.random() * 9000)}`;
    const [rows] = await db.pool.execute(
      'SELECT id FROM intimaciones WHERE grupo_id = ? LIMIT 1',
      [gid]
    );
    colisiona = rows.length > 0;
  } while (colisiona && ++intentos < 5);
  return gid;
}

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
  // Si la fecha de vencimiento efectiva viene inyectada (por un plazo otorgado),
  // se usa esa; si no, se calcula como antes: fecha + plazo_dias (retrocompatible).
  const fechaIntimacion = new Date(intimacion.fecha);
  const plazo = intimacion.plazo_dias || 0;
  let fechaVencimiento;
  if (intimacion.fecha_vencimiento_efectiva) {
    fechaVencimiento = new Date(intimacion.fecha_vencimiento_efectiva);
  } else {
    fechaVencimiento = new Date(fechaIntimacion);
    fechaVencimiento.setDate(fechaVencimiento.getDate() + plazo);
  }

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

// Vencimiento efectivo de una intimación (única fuente de verdad del módulo):
// - Si tiene al menos un plazo otorgado (ultimo_plazo), el del ÚLTIMO plazo
//   (fecha_otorgamiento + dias) — regla R2: fecha_otorgamiento DESC, id DESC.
// - Si no, fecha + plazo_dias (comportamiento pre-cambio).
function fechaVencimientoEfectiva(intimacion) {
  if (intimacion.ultimo_plazo) {
    return new Date(new Date(intimacion.ultimo_plazo.fecha_otorgamiento).getTime() +
      intimacion.ultimo_plazo.dias * 24 * 60 * 60 * 1000);
  }
  return new Date(new Date(intimacion.fecha).getTime() + (intimacion.plazo_dias || 0) * 24 * 60 * 60 * 1000);
}

// Carga el último plazo otorgado de una intimación (regla R2:
// fecha_otorgamiento DESC, id DESC). Retorna null si no hay plazos.
async function cargarUltimoPlazo(intimacionId) {
  const [plazos] = await db.pool.execute(
    `SELECT id, intimacion_id, fecha_otorgamiento, dias, motivo, usuario
     FROM plazos_intimacion WHERE intimacion_id = ?
     ORDER BY fecha_otorgamiento DESC, id DESC LIMIT 1`,
    [intimacionId]
  );
  return plazos[0] || null;
}

// Obtener todas las intimaciones (con filtros y paginación)
exports.obtenerIntimaciones = async (req, res) => {
  try {
    const { tipo, estado, numero, dni, nombre, fecha_desde, fecha_hasta, busqueda, page, limit, exportar } = req.query;
    const esExportacion = exportar === 'true' || exportar === '1';

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

    // Nota: El filtro por estado y el filtro por número (total de actas del caso)
    // se aplicarán DESPUÉS de calcular el estado automático (en memoria).
    const filtroEstado = estado;

    if (fecha_desde) {
      whereClause += ' AND fecha >= ?';
      params.push(fecha_desde);
    }

    if (fecha_hasta) {
      whereClause += ' AND fecha <= ?';
      params.push(fecha_hasta);
    }

    // Búsqueda general (dni, nombre, dirección y grupo_id — UPPER para tolerar minúsculas, patrón de expedientes)
    if (busqueda) {
      const dniTerm = busqueda.replace(/[\s.\-]/g, '');
      whereClause += ` AND (REPLACE(REPLACE(REPLACE(dni, '.', ''), ' ', ''), '-', '') LIKE ? OR nombre_apellido LIKE ? OR direccion LIKE ? OR UPPER(grupo_id) LIKE ?)`;
      params.push(`%${dniTerm}%`, `%${busqueda}%`, `%${busqueda}%`, `%${busqueda.toUpperCase()}%`);
    }

    // Filtros específicos
    if (dni && !busqueda) {
      const dniTerm = dni.replace(/[\s.\-]/g, '');
      whereClause += ' AND REPLACE(REPLACE(REPLACE(dni, \'.\', \'\'), \' \', \'\'), \'-\', \'\') LIKE ?';
      params.push(`%${dniTerm}%`);
    }

    if (nombre && !busqueda) {
      whereClause += ' AND nombre_apellido LIKE ?';
      params.push(`%${nombre}%`);
    }

    // Query principal SIN paginación para poder filtrar por estado calculado
    let sql = 'SELECT i.*, c.label AS rubro_comercial_label FROM intimaciones i LEFT JOIN catalogos c ON c.categoria = \'rubro_comercial\' AND c.valor = i.rubro_comercial' + whereClause;
    sql += ' ORDER BY fecha DESC, id DESC';

    const [allIntimaciones] = await db.pool.execute(sql, params);

    // ── Determinar la última intimación por grupo explícito (grupo_id) ──
    // Esto permite saber cuáles son "reiteradas" (las anteriores al último id)
    // y cuál es la "activa" (la de mayor id) que debe recalcular su estado.
    const [latestPerGroup] = await db.pool.execute(
      `SELECT grupo_id, MAX(id) as ultimo_id, COUNT(*) as total_grupo
       FROM intimaciones
       WHERE grupo_id IS NOT NULL AND grupo_id != ''
       GROUP BY grupo_id`
    );
    const latestMap = new Map();
    latestPerGroup.forEach(r => latestMap.set(r.grupo_id, { ultimo_id: r.ultimo_id, total_grupo: r.total_grupo }));

    // ── Cargar el último plazo otorgado por intimación (si existe) ──
    // Consulta única con placeholders dinámicos por id (el adaptador SQLite no
    // expande arrays dentro de un solo placeholder). El plazo vigente de cada
    // intimación es el ÚLTIMO por regla R2: fecha_otorgamiento DESC, id DESC.
    let plazosMap = new Map();
    if (allIntimaciones.length > 0) {
      const ids = allIntimaciones.map(i => i.id);
      const [plazos] = await db.pool.execute(
        `SELECT id, intimacion_id, fecha_otorgamiento, dias, motivo, usuario
         FROM plazos_intimacion WHERE intimacion_id IN (${ids.map(() => '?').join(', ')})`,
        ids
      );
      for (const p of plazos) {
        const cur = plazosMap.get(p.intimacion_id) || null;
        if (!cur || p.fecha_otorgamiento > cur.fecha_otorgamiento ||
            (p.fecha_otorgamiento === cur.fecha_otorgamiento && p.id > cur.id)) {
          plazosMap.set(p.intimacion_id, p);
        }
      }
    }

    // Calcular estado automático para cada intimación
    const intimacionesConEstado = allIntimaciones.map(item => {
      // Orden fijo (spec R3): mapeo → estado. El vencimiento efectivo se inyecta
      // ANTES de calcular el estado para que el plazo "resucite" la intimación.
      const ultimoPlazo = plazosMap.get(item.id) || null;
      const fechaVenc = fechaVencimientoEfectiva({ ...item, ultimo_plazo: ultimoPlazo });
      let estadoCalculado = calcularEstadoAutomatico({ ...item, ultimo_plazo: ultimoPlazo, fecha_vencimiento_efectiva: fechaVenc });

      // Si NO es la última de su grupo (grupo_id) y no está cumplida/infraccionada,
      // entonces es "reiterada" (fue superada por una intimación más reciente)
      const infoGrupo = item.grupo_id ? latestMap.get(item.grupo_id) : null;
      const esUltima = infoGrupo ? infoGrupo.ultimo_id === item.id : true;
      const totalInstancias = infoGrupo ? infoGrupo.total_grupo : 1;
      if (!esUltima && estadoCalculado !== 'cumplida' && estadoCalculado !== 'infraccionado') {
        estadoCalculado = 'reiterada';
      }

      return {
        ...item,
        ultimo_plazo: ultimoPlazo,
        estado: estadoCalculado,
        total_instancias_grupo: totalInstancias,
        fecha_vencimiento: fechaVenc
      };
    });

    // Aplicar filtros en memoria: estado calculado y número de intimación.
    // El número compara el DENOMINADOR (total_instancias_grupo = cantidad exacta
    // de actas reales del caso), no el numerador (numero_intimacion): así una fila
    // #3/2 (caso con 2 actas reales) NO aparece al filtrar por N=3.
    const numeroTotal = numero !== undefined && numero !== '' ? parseInt(numero, 10) : null;
    let intimacionesFiltradas = intimacionesConEstado;
    if (filtroEstado || numeroTotal !== null) {
      intimacionesFiltradas = intimacionesConEstado.filter(i => {
        if (filtroEstado && i.estado !== filtroEstado) return false;
        if (numeroTotal !== null && (i.total_instancias_grupo || 1) !== numeroTotal) return false;
        return true;
      });
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

    // Si es exportación, devolver todos sin paginar
    if (esExportacion) {
      return res.json({
        success: true,
        data: intimacionesFiltradas,
        stats
      });
    }

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
    let {
      fecha, tipo, nombre_apellido, dni, direccion, tipo_obstruccion,
      plazo_dias, numero_intimacion, observaciones, barrio_id,
      rubro_comercial, grupo_id,
      // Campos Baldíos
      infraccion_realizada, numero_infraccion, fecha_infraccion, propietario_no_ubicado,
      // Campos Vehículos
      marca, modelo, color, dominio, fecha_retiro, lugar_deposito
    } = req.body;

    // Normalizar campos de texto ingresados por operadores
    nombre_apellido = titleCase(nombre_apellido);
    // dni es OPCIONAL (sin DNI se agrupa por nombre+dirección): garantizar string
    // para la columna NOT NULL aunque el payload no traiga la clave (defensivo).
    dni = dni ? normalizarDni(dni) : '';
    direccion = titleCase(direccion);
    tipo_obstruccion = normalizarObstruccion(tipo_obstruccion);
    observaciones = typeof observaciones === 'string' ? observaciones.replace(/\s+/g, ' ').trim() : observaciones;
    marca = titleCase(marca);
    modelo = titleCase(modelo);
    color = titleCase(color);
    dominio = upper(dominio);
    lugar_deposito = titleCase(lugar_deposito);

    // Validar campos obligatorios comunes (dni y direccion son OPCIONALES:
    // sin DNI se agrupa por nombre+dirección; sin ambos es caso único)
    if (!fecha || !tipo || !nombre_apellido) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos obligatorios (fecha, tipo, nombre).'
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

    // ── Determinar grupo_id y numero_intimacion (SIEMPRE automático) ──
    let numeroCalculado = 1;
    const dniNorm = dni ? normalizarDni(dni) : '';
    const dirNorm = normalizarDireccionParaGrupo(direccion);

    if (grupo_id) {
      // Caso A: grupo_id explícito (ej: botón "Siguiente Instancia")
      // → validar pertenencia: 400 si el grupo no existe o no corresponde al infractor
      const [representantes] = await db.pool.execute(
        'SELECT dni, nombre_apellido, direccion FROM intimaciones WHERE grupo_id = ? ORDER BY id ASC LIMIT 1',
        [grupo_id]
      );
      if (representantes.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'El grupo especificado no existe.'
        });
      }
      const representante = representantes[0];
      if (dniNorm) {
        if (dniNorm !== normalizarDni(representante.dni)) {
          return res.status(400).json({
            success: false,
            message: 'El grupo no corresponde al infractor indicado.'
          });
        }
      } else {
        const coincideNombre = normalizarNombreParaGrupo(nombre_apellido) === normalizarNombreParaGrupo(representante.nombre_apellido);
        const coincideDireccion = dirNorm === normalizarDireccionParaGrupo(representante.direccion);
        if (!coincideNombre || !coincideDireccion) {
          return res.status(400).json({
            success: false,
            message: 'El grupo no corresponde al infractor indicado.'
          });
        }
      }
      // Autonumeración sin tope: MAX+1 del grupo
      const [previas] = await db.pool.execute(
        'SELECT MAX(numero_intimacion) as max_num FROM intimaciones WHERE grupo_id = ?',
        [grupo_id]
      );
      numeroCalculado = ((previas[0] && previas[0].max_num) || 0) + 1;
    } else {
      // Caso B: creación desde cero → búsqueda jerárquica de caso activo
      // (1) DNI presente → DNI + dirección normalizada
      // (2) sin DNI con dirección → nombre + dirección normalizada
      // (3) sin DNI ni dirección → caso único, nunca se adosa
      let coincidencia = null;

      if (dniNorm) {
        const [candidatas] = await db.pool.execute(
          'SELECT id, grupo_id, direccion, estado, dio_cumplimiento FROM intimaciones WHERE dni = ? ORDER BY id DESC',
          [dniNorm]
        );
        coincidencia = candidatas.find(c =>
          c.grupo_id &&
          normalizarDireccionParaGrupo(c.direccion) === dirNorm &&
          !c.dio_cumplimiento &&
          c.estado !== 'cumplida'
        );
      } else if (dirNorm) {
        // Subconjunto acotado: filas sin DNI (decenas) → filtrado en memoria
        const [candidatas] = await db.pool.execute(
          "SELECT id, grupo_id, nombre_apellido, direccion, estado, dio_cumplimiento FROM intimaciones WHERE dni = '' OR dni IS NULL ORDER BY id DESC"
        );
        const nombreNorm = normalizarNombreParaGrupo(nombre_apellido);
        coincidencia = candidatas.find(c =>
          c.grupo_id &&
          normalizarNombreParaGrupo(c.nombre_apellido) === nombreNorm &&
          normalizarDireccionParaGrupo(c.direccion) === dirNorm &&
          !c.dio_cumplimiento &&
          c.estado !== 'cumplida'
        );
      }

      if (coincidencia) {
        grupo_id = coincidencia.grupo_id;
        const [previas] = await db.pool.execute(
          'SELECT MAX(numero_intimacion) as max_num FROM intimaciones WHERE grupo_id = ?',
          [grupo_id]
        );
        numeroCalculado = ((previas[0] && previas[0].max_num) || 0) + 1;
      } else {
        grupo_id = await generarGrupoId(fecha);
        numeroCalculado = 1;
      }
    }

    // numero_intimacion es SIEMPRE automático: se ignora el valor del cliente
    numero_intimacion = numeroCalculado;

    const sql = `
      INSERT INTO intimaciones (
        fecha, tipo, nombre_apellido, dni, direccion, tipo_obstruccion, rubro_comercial,
        plazo_dias, numero_intimacion, observaciones, estado,
        infraccion_realizada, numero_infraccion, fecha_infraccion, propietario_no_ubicado,
        marca, modelo, color, dominio, fecha_retiro, lugar_deposito, barrio_id, grupo_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      fecha, tipo, nombre_apellido, dni, direccion, tipo_obstruccion || null,
      rubro_comercial || null,
      plazo_dias || 0, numero_intimacion, observaciones || null, estado,
      esInfraccionada || false, numero_infraccion || null,
      esInfraccionada ? (fecha_infraccion || new Date().toISOString().substring(0, 10)) : (fecha_infraccion || null),
      propietario_no_ubicado || false,
      marca || null, modelo || null, color || null, dominio || null, fecha_retiro || null, lugar_deposito || null,
      barrio_id || null, grupo_id
    ];

    const [result] = await db.pool.execute(sql, values);

    // ── Marcar instancias previas del grupo como 'reiterada' ──
    // Respeta cumplida, ya-reiterada e infraccionado (NOT IN 3 estados)
    await db.pool.execute(
      `UPDATE intimaciones
       SET estado = 'reiterada'
       WHERE grupo_id = ?
         AND id != ?
         AND estado NOT IN ('cumplida', 'reiterada', 'infraccionado')
         AND dio_cumplimiento = 0`,
      [grupo_id, result.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'Intimación creada exitosamente.',
      data: {
        id: result.insertId,
        fecha, tipo, nombre_apellido, dni, direccion,
        tipo_obstruccion: tipo_obstruccion || null,
        rubro_comercial: rubro_comercial || null,
        plazo_dias: plazo_dias || 0,
        numero_intimacion,
        grupo_id,
        observaciones: observaciones || null,
        estado,
        infraccion_realizada: esInfraccionada || false,
        numero_infraccion: numero_infraccion || null,
        fecha_infraccion: esInfraccionada ? (fecha_infraccion || new Date().toISOString().substring(0, 10)) : (fecha_infraccion || null),
        propietario_no_ubicado: propietario_no_ubicado || false,
        marca: marca || null, modelo: modelo || null, color: color || null,
        dominio: dominio || null, fecha_retiro: fecha_retiro || null,
        lugar_deposito: lugar_deposito || null, barrio_id: barrio_id || null
      }
    });

  } catch (error) {
    console.error('Error al crear intimación:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear intimación.'
    });
  }
};

// Otorgar plazo a una intimación (extiende el vencimiento sin crear instancia nueva)
// POST /api/intimaciones/:id/plazo — body { dias, motivo?, fecha_otorgamiento? }
// Solo inserta en plazos_intimacion; NO toca intimaciones (fecha/plazo_dias/estado intactos).
exports.otorgarPlazo = async (req, res) => {
  try {
    const { id } = req.params;
    const { dias, motivo, fecha_otorgamiento } = req.body;

    // R1/R6: dias obligatorio (>0); motivo opcional (vacío → null, patrón crearIntimacion)
    const diasNum = Number(dias);
    if (dias === undefined || dias === null || !Number.isInteger(diasNum) || diasNum <= 0) {
      return res.status(400).json({
        success: false,
        message: 'El campo dias es obligatorio y debe ser un entero mayor a 0.'
      });
    }
    const motivoFinal = typeof motivo === 'string'
      ? (motivo.replace(/\s+/g, ' ').trim() || null)
      : (motivo || null);

    // R9: optional fecha_otorgamiento with FREE range (past/today/future).
    // If present, it must be parseable as an ISO date (YYYY-MM-DD) and is
    // normalized to YYYY-MM-DD; invalid format → 400 without inserting.
    // If absent, today is used.
    let fechaOtorgamiento = new Date().toISOString().substring(0, 10);
    if (fecha_otorgamiento !== undefined && fecha_otorgamiento !== null && fecha_otorgamiento !== '') {
      const fechaParseada = new Date(fecha_otorgamiento);
      if (Number.isNaN(fechaParseada.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'El campo fecha_otorgamiento debe ser una fecha válida (YYYY-MM-DD).'
        });
      }
      fechaOtorgamiento = fechaParseada.toISOString().substring(0, 10);
    }

    // Validar existencia (R1)
    const [exists] = await db.pool.execute('SELECT * FROM intimaciones WHERE id = ?', [id]);
    if (exists.length === 0) {
      return res.status(404).json({ success: false, message: 'Intimación no encontrada.' });
    }
    const intimacion = exists[0];

    // R5: estado CALCULADO con el vencimiento efectivo actual.
    // Solo se permite otorgar plazo a vigente/proxima_vencer/vencida.
    // La lógica de reiterada replica la del mapeo de obtenerIntimaciones:
    // una instancia previa del grupo (no la de mayor id) es 'reiterada'.
    const ultimoPlazo = await cargarUltimoPlazo(id);
    const fechaVenc = fechaVencimientoEfectiva({ ...intimacion, ultimo_plazo: ultimoPlazo });
    let estadoCalculado = calcularEstadoAutomatico({ ...intimacion, ultimo_plazo: ultimoPlazo, fecha_vencimiento_efectiva: fechaVenc });
    if (intimacion.grupo_id && estadoCalculado !== 'cumplida' && estadoCalculado !== 'infraccionado') {
      const [grupo] = await db.pool.execute(
        'SELECT MAX(id) AS ultimo_id FROM intimaciones WHERE grupo_id = ?',
        [intimacion.grupo_id]
      );
      if (!grupo[0] || grupo[0].ultimo_id !== intimacion.id) {
        estadoCalculado = 'reiterada';
      }
    }
    if (!['vigente', 'proxima_vencer', 'vencida'].includes(estadoCalculado)) {
      return res.status(400).json({
        success: false,
        message: `No se puede otorgar plazo a una intimación con estado ${estadoCalculado}.`
      });
    }

    // Persistir el plazo (R2, R6: usuario del token si viene; no exigido)
    const usuario = (req.usuario && req.usuario.usuario) || null;
    const [result] = await db.pool.execute(
      `INSERT INTO plazos_intimacion (intimacion_id, fecha_otorgamiento, dias, motivo, usuario)
       VALUES (?, ?, ?, ?, ?)`,
      [id, fechaOtorgamiento, diasNum, motivoFinal, usuario]
    );

    // Recargar el plazo insertado y recomputar vencimiento efectivo + estado
    const [plazosInsertados] = await db.pool.execute(
      'SELECT * FROM plazos_intimacion WHERE id = ?',
      [result.insertId]
    );
    const plazo = plazosInsertados[0];
    const nuevoUltimo = await cargarUltimoPlazo(id);
    const fechaVencNueva = fechaVencimientoEfectiva({ ...intimacion, ultimo_plazo: nuevoUltimo });
    const estadoNuevo = calcularEstadoAutomatico({ ...intimacion, ultimo_plazo: nuevoUltimo, fecha_vencimiento_efectiva: fechaVencNueva });

    res.status(201).json({
      success: true,
      message: 'Plazo otorgado exitosamente.',
      data: {
        plazo,
        fecha_vencimiento: fechaVencNueva,
        estado: estadoNuevo
      }
    });
  } catch (error) {
    console.error('Error al otorgar plazo:', error);
    res.status(500).json({
      success: false,
      message: 'Error al otorgar plazo.'
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

    // Normalizar campos de texto ingresados por operadores
    const camposNormalizables = {
      nombre_apellido: titleCase,
      dni: normalizarDni,
      direccion: titleCase,
      tipo_obstruccion: normalizarObstruccion,
      marca: titleCase,
      modelo: titleCase,
      color: titleCase,
      lugar_deposito: titleCase,
      dominio: upper
    };
    for (const [campo, fn] of Object.entries(camposNormalizables)) {
      if (updates[campo] !== undefined) {
        updates[campo] = fn(updates[campo]);
      }
    }
    if (typeof updates.observaciones === 'string') {
      updates.observaciones = updates.observaciones.replace(/\s+/g, ' ').trim();
    }

    // Construir query dinámica
    // grupo_id y numero_intimacion son INMUTABLES: nunca se editan desde PUT
    delete updates.grupo_id;
    const allowedFields = [
      'fecha', 'tipo', 'nombre_apellido', 'dni', 'direccion', 'tipo_obstruccion', 'rubro_comercial',
      'plazo_dias', 'observaciones', 'estado', 'dio_cumplimiento', 'fecha_subsanacion',
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
        var hoy = new Date();
        var yyyy = hoy.getFullYear();
        var mm = String(hoy.getMonth() + 1).padStart(2, '0');
        var dd = String(hoy.getDate()).padStart(2, '0');
        values.push(yyyy + '-' + mm + '-' + dd);
      }
    } else if (updates.dio_cumplimiento === false || updates.dio_cumplimiento === '0' || updates.dio_cumplimiento === 0) {
      // Si se desmarca cumplimiento, limpiar fecha y recalcular estado
      if (!fields.includes('fecha_subsanacion = ?')) {
        fields.push('fecha_subsanacion = ?');
        values.push(null);
      }
      if (!fields.includes('estado = ?')) {
        const [rows] = await db.pool.execute('SELECT * FROM intimaciones WHERE id = ?', [id]);
        const current = rows[0];
        const merged = { ...current, ...updates, dio_cumplimiento: false };
        const nuevoEstado = calcularEstadoAutomatico(merged);
        fields.push('estado = ?');
        values.push(nuevoEstado);
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

    const intimacion = rows[0];

    // Historial de plazos otorgados (R2) — orden fecha_otorgamiento DESC, id DESC
    const [plazos] = await db.pool.execute(
      'SELECT * FROM plazos_intimacion WHERE intimacion_id = ? ORDER BY fecha_otorgamiento DESC, id DESC',
      [id]
    );

    // Estado calculado con el vencimiento efectivo (último plazo si existe)
    const ultimoPlazo = plazos[0] || null;
    const fechaVenc = fechaVencimientoEfectiva({ ...intimacion, ultimo_plazo: ultimoPlazo });
    const estadoCalculado = calcularEstadoAutomatico({ ...intimacion, ultimo_plazo: ultimoPlazo, fecha_vencimiento_efectiva: fechaVenc });

    res.json({
      success: true,
      data: {
        ...intimacion,
        estado: estadoCalculado,
        fecha_vencimiento: fechaVenc,
        plazos
      }
    });
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
