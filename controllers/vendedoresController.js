// controllers/vendedoresController.js
const db = require('../config/database');

// ==========================================
// OBTENER VENDEDORES (con filtros y paginación)
// ==========================================
const obtenerVendedores = async (req, res) => {
    try {
        const { rubro, tiene_autorizacion, pago_canon, barrio_id, fecha_desde, fecha_hasta, page = 1, limit = 50 } = req.query;

        let query = 'SELECT v.*, b.nombre AS barrio_nombre FROM vendedores_ambulantes v LEFT JOIN barrios b ON v.barrio_id = b.id WHERE 1=1';
        const params = [];

        if (rubro) {
            query += ' AND v.rubro LIKE ?';
            params.push(`%${rubro}%`);
        }
        if (tiene_autorizacion !== undefined && tiene_autorizacion !== '') {
            query += ' AND v.tiene_autorizacion = ?';
            params.push(tiene_autorizacion);
        }
        if (pago_canon !== undefined && pago_canon !== '') {
            query += ' AND v.pago_canon = ?';
            params.push(pago_canon);
        }
        if (barrio_id) {
            query += ' AND v.barrio_id = ?';
            params.push(barrio_id);
        }
        if (fecha_desde) {
            query += ' AND v.fecha_relevamiento >= ?';
            params.push(fecha_desde);
        }
        if (fecha_hasta) {
            query += ' AND v.fecha_relevamiento <= ?';
            params.push(fecha_hasta);
        }

        // Contar total
        const countQuery = query.replace('SELECT v.*, b.nombre AS barrio_nombre', 'SELECT COUNT(*) as total');
        const countResult = await db.query(countQuery, params);
        const total = countResult[0].total;

        // Paginación
        const offset = (page - 1) * limit;
        query += ' ORDER BY v.fecha_relevamiento DESC, v.id DESC LIMIT ? OFFSET ?';
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
        console.error('Error al obtener vendedores:', error);
        res.status(500).json({ success: false, message: 'Error al obtener vendedores' });
    }
};

// ==========================================
// CREAR VENDEDOR
// ==========================================
const crearVendedor = async (req, res) => {
    try {
        const {
            fecha_relevamiento, nombre_vendedor, dni_vendedor,
            ubicacion, rubro, tiene_autorizacion, pago_canon,
            numero_recibo, fecha_vencimiento_canon, dias_vigencia,
            observaciones, barrio_id
        } = req.body;

        if (!fecha_relevamiento || !ubicacion) {
            return res.status(400).json({
                success: false,
                message: 'Fecha y ubicación son obligatorios'
            });
        }

        const result = await db.query(
            `INSERT INTO vendedores_ambulantes (fecha_relevamiento, nombre_vendedor, dni_vendedor,
             ubicacion, rubro, tiene_autorizacion, pago_canon, numero_recibo,
             fecha_vencimiento_canon, dias_vigencia, observaciones, barrio_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [fecha_relevamiento, nombre_vendedor || null, dni_vendedor || null,
                ubicacion, rubro || null, tiene_autorizacion ? 1 : 0, pago_canon ? 1 : 0,
                numero_recibo || null, fecha_vencimiento_canon || null,
                dias_vigencia || null, observaciones || null, barrio_id || null]
        );

        const nuevo = await db.query(
            'SELECT v.*, b.nombre AS barrio_nombre FROM vendedores_ambulantes v LEFT JOIN barrios b ON v.barrio_id = b.id WHERE v.id = ?',
            [result.insertId]
        );

        res.status(201).json({
            success: true,
            message: 'Vendedor registrado correctamente',
            data: nuevo[0]
        });
    } catch (error) {
        console.error('Error al crear vendedor:', error);
        res.status(500).json({ success: false, message: 'Error al crear vendedor' });
    }
};

// ==========================================
// ACTUALIZAR VENDEDOR
// ==========================================
const actualizarVendedor = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            fecha_relevamiento, nombre_vendedor, dni_vendedor,
            ubicacion, rubro, tiene_autorizacion, pago_canon,
            numero_recibo, fecha_vencimiento_canon, dias_vigencia,
            observaciones, barrio_id
        } = req.body;

        const result = await db.query(
            `UPDATE vendedores_ambulantes SET fecha_relevamiento = ?, nombre_vendedor = ?,
             dni_vendedor = ?, ubicacion = ?, rubro = ?,
             tiene_autorizacion = ?, pago_canon = ?, numero_recibo = ?,
             fecha_vencimiento_canon = ?, dias_vigencia = ?,
             observaciones = ?, barrio_id = ?
             WHERE id = ?`,
            [fecha_relevamiento, nombre_vendedor || null, dni_vendedor || null,
                ubicacion, rubro || null, tiene_autorizacion ? 1 : 0, pago_canon ? 1 : 0,
                numero_recibo || null, fecha_vencimiento_canon || null,
                dias_vigencia || null, observaciones || null, barrio_id || null, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Vendedor no encontrado' });
        }

        const actualizado = await db.query(
            'SELECT v.*, b.nombre AS barrio_nombre FROM vendedores_ambulantes v LEFT JOIN barrios b ON v.barrio_id = b.id WHERE v.id = ?',
            [id]
        );

        res.json({ success: true, message: 'Vendedor actualizado', data: actualizado[0] });
    } catch (error) {
        console.error('Error al actualizar vendedor:', error);
        res.status(500).json({ success: false, message: 'Error al actualizar vendedor' });
    }
};

// ==========================================
// ELIMINAR VENDEDOR
// ==========================================
const eliminarVendedor = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query('DELETE FROM vendedores_ambulantes WHERE id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Vendedor no encontrado' });
        }

        res.json({ success: true, message: 'Vendedor eliminado' });
    } catch (error) {
        console.error('Error al eliminar vendedor:', error);
        res.status(500).json({ success: false, message: 'Error al eliminar vendedor' });
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
                SUM(CASE WHEN tiene_autorizacion = 1 THEN 1 ELSE 0 END) as autorizados,
                SUM(CASE WHEN tiene_autorizacion = 0 THEN 1 ELSE 0 END) as no_autorizados,
                SUM(CASE WHEN pago_canon = 1 THEN 1 ELSE 0 END) as pagaron_canon,
                SUM(CASE WHEN pago_canon = 1 AND fecha_vencimiento_canon < CURDATE() THEN 1 ELSE 0 END) as canon_vencido,
                COUNT(CASE WHEN MONTH(fecha_relevamiento) = MONTH(CURDATE()) AND YEAR(fecha_relevamiento) = YEAR(CURDATE()) THEN 1 END) as este_mes
            FROM vendedores_ambulantes
        `);

        res.json({ success: true, data: stats[0] });
    } catch (error) {
        console.error('Error estadísticas vendedores:', error);
        res.status(500).json({ success: false, message: 'Error al obtener estadísticas' });
    }
};

module.exports = {
    obtenerVendedores,
    crearVendedor,
    actualizarVendedor,
    eliminarVendedor,
    obtenerEstadisticas
};
