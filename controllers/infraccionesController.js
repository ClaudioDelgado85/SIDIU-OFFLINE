// controllers/infraccionesController.js
// Controlador para gestión de actas de infracción

const db = require('../config/database');

// Obtener todas las infracciones (con filtros y paginación)
exports.obtenerInfracciones = async (req, res) => {
    try {
        const { dni, nombre, numero_acta, fecha_desde, fecha_hasta, busqueda, page, limit } = req.query;

        // Configuración de paginación
        const currentPage = parseInt(page) || 1;
        const recordsPerPage = parseInt(limit) || 10;
        const offset = (currentPage - 1) * recordsPerPage;

        let whereClause = ' WHERE 1=1';
        const params = [];

        // Aplicar filtros
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
            whereClause += ' AND (dni LIKE ? OR nombre_apellido LIKE ? OR numero_acta LIKE ?)';
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

        if (numero_acta && !busqueda) {
            whereClause += ' AND numero_acta LIKE ?';
            params.push(`%${numero_acta}%`);
        }

        // Contar total
        const countSql = 'SELECT COUNT(*) as total FROM infracciones' + whereClause;
        const [countResult] = await db.pool.execute(countSql, params);
        const totalRecords = countResult[0].total;
        const totalPages = Math.ceil(totalRecords / recordsPerPage);

        // Query principal
        let sql = 'SELECT * FROM infracciones' + whereClause;
        sql += ' ORDER BY fecha DESC, id DESC';
        sql += ' LIMIT ? OFFSET ?';

        const paginationParams = [...params, recordsPerPage.toString(), offset.toString()];
        const [infracciones] = await db.pool.execute(sql, paginationParams);

        res.json({
            success: true,
            data: infracciones,
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
        console.error('Error al obtener infracciones:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener infracciones.'
        });
    }
};

// Crear nueva infracción
exports.crearInfraccion = async (req, res) => {
    try {
        const {
            fecha, nombre_apellido, dni, numero_acta, direccion, motivo_infraccion, observaciones, barrio_id
        } = req.body;

        // Validar campos obligatorios
        if (!fecha || !nombre_apellido || !dni || !numero_acta || !direccion || !motivo_infraccion) {
            return res.status(400).json({
                success: false,
                message: 'Faltan campos obligatorios (fecha, nombre, dni, acta, dirección, motivo).'
            });
        }

        // Verificar si el número de acta ya existe
        const [existing] = await db.pool.execute('SELECT id FROM infracciones WHERE numero_acta = ?', [numero_acta]);
        if (existing.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'El número de acta ya existe.'
            });
        }

        const sql = `
      INSERT INTO infracciones (
        fecha, nombre_apellido, dni, numero_acta, direccion, motivo_infraccion, observaciones, barrio_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

        const values = [
            fecha, nombre_apellido, dni, numero_acta, direccion, motivo_infraccion, observaciones || null, barrio_id || null
        ];

        const [result] = await db.pool.execute(sql, values);

        res.status(201).json({
            success: true,
            message: 'Infracción creada exitosamente.',
            data: { id: result.insertId, ...req.body }
        });

    } catch (error) {
        console.error('Error al crear infracción:', error);
        res.status(500).json({
            success: false,
            message: 'Error al crear infracción.'
        });
    }
};

// Actualizar infracción
exports.actualizarInfraccion = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Validar existencia
        const [exists] = await db.pool.execute('SELECT id FROM infracciones WHERE id = ?', [id]);
        if (exists.length === 0) {
            return res.status(404).json({ success: false, message: 'Infracción no encontrada.' });
        }

        // Construir query dinámica
        const allowedFields = [
            'fecha', 'nombre_apellido', 'dni', 'numero_acta', 'direccion', 'motivo_infraccion', 'observaciones', 'barrio_id'
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

        values.push(id);
        const sql = `UPDATE infracciones SET ${fields.join(', ')} WHERE id = ?`;

        await db.pool.execute(sql, values);

        res.json({
            success: true,
            message: 'Infracción actualizada exitosamente.'
        });

    } catch (error) {
        console.error('Error al actualizar infracción:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar infracción.'
        });
    }
};

// Eliminar infracción
exports.eliminarInfraccion = async (req, res) => {
    try {
        const { id } = req.params;

        // Validar existencia
        const [exists] = await db.pool.execute('SELECT id FROM infracciones WHERE id = ?', [id]);
        if (exists.length === 0) {
            return res.status(404).json({ success: false, message: 'Infracción no encontrada.' });
        }

        await db.pool.execute('DELETE FROM infracciones WHERE id = ?', [id]);

        res.json({
            success: true,
            message: 'Infracción eliminada correctamente.'
        });
    } catch (error) {
        console.error('Error al eliminar infracción:', error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar infracción.'
        });
    }
};

// ==========================================
// OBTENER INFRACCIÓN POR ID
// ==========================================
exports.obtenerInfraccionPorId = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await db.pool.execute('SELECT * FROM infracciones WHERE id = ?', [id]);

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Infracción no encontrada' });
        }

        res.json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('Error obtenerInfraccionPorId:', error);
        res.status(500).json({ success: false, message: 'Error al obtener infracción' });
    }
};
