// controllers/relevamientosController.js
const db = require('../config/database');

// ==========================================
// OBTENER RELEVAMIENTOS (con filtros)
// ==========================================
exports.obtenerRelevamientos = async (req, res) => {
    try {
        const { tipo, zona, fecha_desde, fecha_hasta, busqueda, page = 1, limit = 10 } = req.query;

        const offset = (page - 1) * limit;
        const recordsPerPage = parseInt(limit);

        let whereClause = 'WHERE 1=1';
        const params = [];

        if (tipo) { whereClause += ' AND tipo_relevamiento = ?'; params.push(tipo); }
        if (zona) { whereClause += ' AND zona LIKE ?'; params.push(`%${zona}%`); }

        if (fecha_desde) { whereClause += ' AND fecha_relevamiento >= ?'; params.push(fecha_desde); }
        if (fecha_hasta) { whereClause += ' AND fecha_relevamiento <= ?'; params.push(fecha_hasta); }

        if (busqueda) {
            whereClause += ' AND (numero_relevamiento LIKE ? OR ubicacion LIKE ? OR responsable_nombre LIKE ? OR observaciones LIKE ?)';
            params.push(`%${busqueda}%`, `%${busqueda}%`, `%${busqueda}%`, `%${busqueda}%`);
        }

        // Count Total
        const [countResult] = await db.pool.execute(`SELECT COUNT(*) as total FROM relevamientos ${whereClause}`, params);
        const totalRecords = countResult[0].total;
        const totalPages = Math.ceil(totalRecords / recordsPerPage);

        // Fetch Data
        const sql = `
            SELECT * FROM relevamientos 
            ${whereClause} 
            ORDER BY fecha_relevamiento DESC, id DESC 
            LIMIT ? OFFSET ?
        `;
        params.push(recordsPerPage, offset);

        const [rows] = await db.pool.execute(sql, params);

        res.json({
            success: true,
            data: rows,
            pagination: {
                totalRecords,
                totalPages,
                currentPage: parseInt(page),
                recordsPerPage
            }
        });

    } catch (error) {
        console.error('Error obtenerRelevamientos:', error);
        res.status(500).json({ success: false, message: 'Error al obtener relevamientos' });
    }
};

// ==========================================
// CREAR RELEVAMIENTO
// ==========================================
exports.crearRelevamiento = async (req, res) => {
    try {
        const {
            fecha_relevamiento,
            tipo_relevamiento,
            ubicacion,
            zona,
            responsable_nombre,
            responsable_dni,
            observaciones,
            foto_url,
            barrio_id,
            // Campos opcionales Espacio Público
            tiene_autorizacion,
            paga_canon,
            fecha_vencimiento_canon
        } = req.body;

        if (!fecha_relevamiento || !tipo_relevamiento || !ubicacion) {
            return res.status(400).json({ success: false, message: 'Faltan campos obligatorios' });
        }

        // Generar Número (Ej: B-2026-001)
        const year = new Date().getFullYear();
        let prefix = 'V'; // Varios por defecto
        if (tipo_relevamiento === 'baldio') prefix = 'B';
        if (tipo_relevamiento === 'obra') prefix = 'O';
        if (tipo_relevamiento === 'ocupacion') prefix = 'OC';
        if (tipo_relevamiento === 'comercio') prefix = 'C';

        const [last] = await db.pool.execute(
            'SELECT numero_relevamiento FROM relevamientos WHERE numero_relevamiento LIKE ? ORDER BY id DESC LIMIT 1',
            [`${prefix}-${year}-%`]
        );

        let sequence = 1;
        if (last.length > 0) {
            const parts = last[0].numero_relevamiento.split('-');
            sequence = parseInt(parts[2]) + 1;
        }

        const numero_relevamiento = `${prefix}-${year}-${String(sequence).padStart(3, '0')}`;

        const sql = `
            INSERT INTO relevamientos (
                numero_relevamiento, fecha_relevamiento, tipo_relevamiento, ubicacion, zona,
                responsable_nombre, responsable_dni, observaciones, foto_url,
                tiene_autorizacion, paga_canon, fecha_vencimiento_canon, barrio_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        await db.pool.execute(sql, [
            numero_relevamiento,
            fecha_relevamiento,
            tipo_relevamiento,
            ubicacion,
            zona || null,
            responsable_nombre || null,
            responsable_dni || null,
            observaciones || null,
            foto_url || null,
            tiene_autorizacion ? 1 : 0,
            paga_canon ? 1 : 0,
            fecha_vencimiento_canon || null,
            barrio_id || null
        ]);

        res.json({ success: true, message: 'Relevamiento creado correctamente', numero: numero_relevamiento });

    } catch (error) {
        console.error('Error crearRelevamiento:', error);
        res.status(500).json({ success: false, message: 'Error al crear relevamiento' });
    }
};

// ==========================================
// ACTUALIZAR RELEVAMIENTO
// ==========================================
exports.actualizarRelevamiento = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            ubicacion,
            zona,
            responsable_nombre,
            responsable_dni,
            observaciones,
            foto_url,
            barrio_id,
            tiene_autorizacion,
            paga_canon,
            fecha_vencimiento_canon
        } = req.body;

        const sql = `
            UPDATE relevamientos SET 
                ubicacion = ?, zona = ?, responsable_nombre = ?, responsable_dni = ?, 
                observaciones = ?, foto_url = ?, tiene_autorizacion = ?, 
                paga_canon = ?, fecha_vencimiento_canon = ?, barrio_id = ?
            WHERE id = ?
        `;

        await db.pool.execute(sql, [
            ubicacion, zona || null, responsable_nombre || null, responsable_dni || null,
            observaciones || null, foto_url || null,
            tiene_autorizacion ? 1 : 0, paga_canon ? 1 : 0, fecha_vencimiento_canon || null,
            barrio_id || null,
            id
        ]);

        res.json({ success: true, message: 'Relevamiento actualizado' });

    } catch (error) {
        console.error('Error actualizarRelevamiento:', error);
        res.status(500).json({ success: false, message: 'Error al actualizar' });
    }
};

// ==========================================
// ELIMINAR RELEVAMIENTO
// ==========================================
exports.eliminarRelevamiento = async (req, res) => {
    try {
        const { id } = req.params;
        await db.pool.execute('DELETE FROM relevamientos WHERE id = ?', [id]);
        res.json({ success: true, message: 'Relevamiento eliminado' });
    } catch (error) {
        console.error('Error eliminarRelevamiento:', error);
        res.status(500).json({ success: false, message: 'Error al eliminar' });
    }
};

// ==========================================
// ESTADÍSTICAS
// ==========================================
exports.obtenerEstadisticas = async (req, res) => {
    try {
        const [porTipo] = await db.pool.execute('SELECT tipo_relevamiento, COUNT(*) as count FROM relevamientos GROUP BY tipo_relevamiento');

        // Total
        const [totalRes] = await db.pool.execute('SELECT COUNT(*) as total FROM relevamientos');

        res.json({
            success: true,
            total: totalRes[0].total,
            tipos: porTipo
        });
    } catch (error) {
        console.error('Error estadisticas:', error);
        res.status(500).json({ success: false, message: 'Error en estadísticas' });
    }
};

// ==========================================
// OBTENER RELEVAMIENTO POR ID
// ==========================================
exports.obtenerRelevamientoPorId = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await db.pool.execute('SELECT * FROM relevamientos WHERE id = ?', [id]);

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Relevamiento no encontrado' });
        }

        res.json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('Error obtenerRelevamientoPorId:', error);
        res.status(500).json({ success: false, message: 'Error al obtener relevamiento' });
    }
};
