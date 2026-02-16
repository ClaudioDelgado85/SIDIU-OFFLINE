// controllers/reclamosController.js
const db = require('../config/database');

// Generar siguiente número de reclamo (R-2026-001)
async function generarNumeroReclamo() {
    const year = new Date().getFullYear();
    const prefix = `R-${year}-`;

    // Buscar el último número generado este año
    const [rows] = await db.pool.execute(
        'SELECT numero_reclamo FROM reclamos WHERE numero_reclamo LIKE ? ORDER BY id DESC LIMIT 1',
        [`${prefix}%`]
    );

    let sequence = 1;
    if (rows.length > 0) {
        // Extraer la parte numérica: R-2026-045 -> 45
        const lastNum = rows[0].numero_reclamo.split('-')[2];
        sequence = parseInt(lastNum) + 1;
    }

    // Formatear con ceros a la izquierda (001)
    return `${prefix}${String(sequence).padStart(3, '0')}`;
}

// Obtener Reclamos
exports.obtenerReclamos = async (req, res) => {
    try {
        const { estado, prioridad, tipo, fecha_desde, fecha_hasta, busqueda, page, limit } = req.query;

        const currentPage = parseInt(page) || 1;
        const recordsPerPage = parseInt(limit) || 10;
        const offset = (currentPage - 1) * recordsPerPage;

        let whereClause = ' WHERE 1=1';
        const params = [];

        if (estado) { whereClause += ' AND estado = ?'; params.push(estado); }
        if (prioridad) { whereClause += ' AND prioridad = ?'; params.push(prioridad); }
        if (tipo) { whereClause += ' AND tipo_reclamo = ?'; params.push(tipo); }

        if (fecha_desde) { whereClause += ' AND DATE(fecha_creacion) >= ?'; params.push(fecha_desde); }
        if (fecha_hasta) { whereClause += ' AND DATE(fecha_creacion) <= ?'; params.push(fecha_hasta); }

        if (busqueda) {
            whereClause += ' AND (numero_reclamo LIKE ? OR direccion_incidente LIKE ? OR vecino_nombre LIKE ? OR descripcion LIKE ? OR denunciado_nombre LIKE ? OR denunciado_dni LIKE ?)';
            params.push(`%${busqueda}%`, `%${busqueda}%`, `%${busqueda}%`, `%${busqueda}%`, `%${busqueda}%`, `%${busqueda}%`);
        }

        // Count
        const [countResult] = await db.pool.execute(`SELECT COUNT(*) as total FROM reclamos ${whereClause}`, params);
        const totalRecords = countResult[0].total;
        const totalPages = Math.ceil(totalRecords / recordsPerPage);

        // Query
        const sql = `SELECT * FROM reclamos ${whereClause} ORDER BY fecha_creacion DESC LIMIT ? OFFSET ?`;

        // Fix: params array needs to be spread correctly or passed directly depending on mysql2 version, 
        // but here spread is safe for offset/limit strings
        const queryParams = [...params, recordsPerPage.toString(), offset.toString()];
        const [rows] = await db.pool.execute(sql, queryParams);

        res.json({
            success: true,
            data: rows,
            pagination: { currentPage, totalPages, totalRecords, recordsPerPage }
        });

    } catch (error) {
        console.error('Error obtenerReclamos:', error);
        res.status(500).json({ success: false, message: 'Error al obtener reclamos' });
    }
};

// Crear Reclamo
exports.crearReclamo = async (req, res) => {
    try {
        const {
            tipo_reclamo, descripcion, direccion_incidente, prioridad,
            vecino_nombre, vecino_telefono,
            denunciado_nombre, denunciado_dni, denunciado_direccion, barrio_id
        } = req.body;

        // Validar obligatorios
        if (!tipo_reclamo || !descripcion || !direccion_incidente) {
            return res.status(400).json({ success: false, message: 'Faltan campos obligatorios' });
        }

        const numero_reclamo = await generarNumeroReclamo();
        const usuario_id = req.user ? req.user.id : null;

        const sql = `
            INSERT INTO reclamos (
                numero_reclamo, tipo_reclamo, descripcion, direccion_incidente, 
                denunciado_nombre, denunciado_dni, denunciado_direccion,
                prioridad, vecino_nombre, vecino_telefono, usuario_creador_id, barrio_id
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const [result] = await db.pool.execute(sql, [
            numero_reclamo,
            tipo_reclamo,
            descripcion,
            direccion_incidente,
            denunciado_nombre || null,
            denunciado_dni || null,
            denunciado_direccion || null,
            prioridad || 'media',
            vecino_nombre || null,
            vecino_telefono || null,
            usuario_id || null,
            barrio_id || null
        ]);

        res.status(201).json({
            success: true,
            message: 'Reclamo creado exitosamente',
            data: { id: result.insertId, numero_reclamo }
        });

    } catch (error) {
        console.error('Error crearReclamo:', error);
        res.status(500).json({ success: false, message: 'Error al crear reclamo' });
    }
};

// Actualizar Reclamo (solo estado/resolución)
exports.actualizarReclamo = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado, observaciones_resolucion } = req.body;

        let sql = `UPDATE reclamos SET estado = ?, observaciones_resolucion = ?`;
        const params = [estado, observaciones_resolucion];

        // Si se resuelve, marcar fecha
        if (estado === 'resuelto') {
            sql += `, fecha_resolucion = NOW()`;
        }

        sql += ` WHERE id = ?`;
        params.push(id);

        await db.pool.execute(sql, params);

        res.json({ success: true, message: 'Reclamo actualizado' });

    } catch (error) {
        console.error('Error actualizarReclamo:', error);
        res.status(500).json({ success: false, message: 'Error al actualizar reclamo' });
    }
};

// Eliminar Reclamo
exports.eliminarReclamo = async (req, res) => {
    try {
        const { id } = req.params;
        await db.pool.execute('DELETE FROM reclamos WHERE id = ?', [id]);
        res.json({ success: true, message: 'Reclamo eliminado' });
    } catch (error) {
        console.error('Error eliminarReclamo:', error);
        res.status(500).json({ success: false, message: 'Error al eliminar' });
    }
};

// Estadísticas para Dashboard
exports.obtenerEstadisticas = async (req, res) => {
    try {
        const [porEstado] = await db.pool.execute('SELECT estado, COUNT(*) as count FROM reclamos GROUP BY estado');
        const [porPrioridad] = await db.pool.execute('SELECT prioridad, COUNT(*) as count FROM reclamos WHERE estado != "resuelto" GROUP BY prioridad');

        res.json({
            success: true,
            estados: porEstado,
            prioridades: porPrioridad
        });
    } catch (error) {
        console.error('Error obtenerEstadisticas:', error);
        res.status(500).json({ success: false, message: 'Error en estadísticas' });
    }
};
// ==========================================
// OBTENER RECLAMO POR ID
// ==========================================
exports.obtenerReclamoPorId = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await db.pool.execute('SELECT * FROM reclamos WHERE id = ?', [id]);

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Reclamo no encontrado' });
        }

        res.json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('Error obtenerReclamoPorId:', error);
        res.status(500).json({ success: false, message: 'Error al obtener reclamo' });
    }
};
