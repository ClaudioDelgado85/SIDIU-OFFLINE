// controllers/comerciosController.js
const db = require('../config/database');

// ==========================================
// OBTENER COMERCIOS (con filtros y paginación)
// ==========================================
const obtenerComercios = async (req, res) => {
    try {
        const { rubro, esta_habilitado, barrio_id, fecha_desde, fecha_hasta, page = 1, limit = 50 } = req.query;

        let query = 'SELECT c.*, b.nombre AS barrio_nombre FROM comercios c LEFT JOIN barrios b ON c.barrio_id = b.id WHERE 1=1';
        const params = [];

        if (rubro) {
            query += ' AND c.rubro LIKE ?';
            params.push(`%${rubro}%`);
        }
        if (esta_habilitado !== undefined && esta_habilitado !== '') {
            query += ' AND c.esta_habilitado = ?';
            params.push(esta_habilitado);
        }
        if (barrio_id) {
            query += ' AND c.barrio_id = ?';
            params.push(barrio_id);
        }
        if (fecha_desde) {
            query += ' AND c.fecha_relevamiento >= ?';
            params.push(fecha_desde);
        }
        if (fecha_hasta) {
            query += ' AND c.fecha_relevamiento <= ?';
            params.push(fecha_hasta);
        }

        // Contar total
        const countQuery = query.replace('SELECT c.*, b.nombre AS barrio_nombre', 'SELECT COUNT(*) as total');
        const countResult = await db.query(countQuery, params);
        const total = countResult[0].total;

        // Paginación
        const offset = (page - 1) * limit;
        query += ' ORDER BY c.fecha_relevamiento DESC, c.id DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), offset);

        const rows = await db.query(query, params);

        res.json({
            success: true,
            data: rows,
            pagination: {
                total,
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                limit: parseInt(limit)
            }
        });
    } catch (error) {
        console.error('Error al obtener comercios:', error);
        res.status(500).json({ success: false, message: 'Error al obtener comercios' });
    }
};

// ==========================================
// CREAR COMERCIO
// ==========================================
const crearComercio = async (req, res) => {
    try {
        const {
            fecha_relevamiento, nombre_propietario, dni_propietario,
            direccion_comercial, rubro, esta_habilitado,
            numero_resolucion, necesita_reempadronamiento,
            observaciones, barrio_id
        } = req.body;

        if (!fecha_relevamiento || !direccion_comercial) {
            return res.status(400).json({
                success: false,
                message: 'Fecha y dirección comercial son obligatorios'
            });
        }

        const result = await db.query(
            `INSERT INTO comercios (fecha_relevamiento, nombre_propietario, dni_propietario,
             direccion_comercial, rubro, esta_habilitado, numero_resolucion,
             necesita_reempadronamiento, observaciones, barrio_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [fecha_relevamiento, nombre_propietario || null, dni_propietario || null,
                direccion_comercial, rubro || null, esta_habilitado ? 1 : 0,
                numero_resolucion || null, necesita_reempadronamiento ? 1 : 0,
                observaciones || null, barrio_id || null]
        );

        // Devolver el registro creado
        const nuevo = await db.query(
            'SELECT c.*, b.nombre AS barrio_nombre FROM comercios c LEFT JOIN barrios b ON c.barrio_id = b.id WHERE c.id = ?',
            [result.insertId]
        );

        res.status(201).json({
            success: true,
            message: 'Comercio registrado correctamente',
            data: nuevo[0]
        });
    } catch (error) {
        console.error('Error al crear comercio:', error);
        res.status(500).json({ success: false, message: 'Error al crear comercio' });
    }
};

// ==========================================
// ACTUALIZAR COMERCIO
// ==========================================
const actualizarComercio = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            fecha_relevamiento, nombre_propietario, dni_propietario,
            direccion_comercial, rubro, esta_habilitado,
            numero_resolucion, necesita_reempadronamiento,
            observaciones, barrio_id
        } = req.body;

        const result = await db.query(
            `UPDATE comercios SET fecha_relevamiento = ?, nombre_propietario = ?,
             dni_propietario = ?, direccion_comercial = ?, rubro = ?,
             esta_habilitado = ?, numero_resolucion = ?,
             necesita_reempadronamiento = ?, observaciones = ?, barrio_id = ?
             WHERE id = ?`,
            [fecha_relevamiento, nombre_propietario || null, dni_propietario || null,
                direccion_comercial, rubro || null, esta_habilitado ? 1 : 0,
                numero_resolucion || null, necesita_reempadronamiento ? 1 : 0,
                observaciones || null, barrio_id || null, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Comercio no encontrado' });
        }

        const actualizado = await db.query(
            'SELECT c.*, b.nombre AS barrio_nombre FROM comercios c LEFT JOIN barrios b ON c.barrio_id = b.id WHERE c.id = ?',
            [id]
        );

        res.json({ success: true, message: 'Comercio actualizado', data: actualizado[0] });
    } catch (error) {
        console.error('Error al actualizar comercio:', error);
        res.status(500).json({ success: false, message: 'Error al actualizar comercio' });
    }
};

// ==========================================
// ELIMINAR COMERCIO
// ==========================================
const eliminarComercio = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query('DELETE FROM comercios WHERE id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Comercio no encontrado' });
        }

        res.json({ success: true, message: 'Comercio eliminado' });
    } catch (error) {
        console.error('Error al eliminar comercio:', error);
        res.status(500).json({ success: false, message: 'Error al eliminar comercio' });
    }
};

// ==========================================
// ESTADÍSTICAS
// ==========================================
const obtenerEstadisticas = async (req, res) => {
    try {
        const stats = await db.query(`
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN esta_habilitado = 1 THEN 1 ELSE 0 END) as habilitados,
                SUM(CASE WHEN esta_habilitado = 0 THEN 1 ELSE 0 END) as no_habilitados,
                SUM(CASE WHEN necesita_reempadronamiento = 1 THEN 1 ELSE 0 END) as necesitan_reempadronamiento,
                COUNT(CASE WHEN MONTH(fecha_relevamiento) = MONTH(CURDATE()) AND YEAR(fecha_relevamiento) = YEAR(CURDATE()) THEN 1 END) as este_mes
            FROM comercios
        `);

        res.json({ success: true, data: stats[0] });
    } catch (error) {
        console.error('Error estadísticas comercios:', error);
        res.status(500).json({ success: false, message: 'Error al obtener estadísticas' });
    }
};

module.exports = {
    obtenerComercios,
    crearComercio,
    actualizarComercio,
    eliminarComercio,
    obtenerEstadisticas
};
