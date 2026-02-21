// controllers/catalogosController.js
// Controlador genérico para gestión de catálogos

const db = require('../config/database');

// Obtener opciones por categoría (para selects — todos los roles)
exports.obtenerPorCategoria = async (req, res) => {
    try {
        const { categoria } = req.query;
        if (!categoria) {
            return res.status(400).json({ success: false, message: 'Se requiere el parámetro "categoria"' });
        }

        const [rows] = await db.pool.execute(
            'SELECT id, valor, label FROM catalogos WHERE categoria = ? AND activo = 1 ORDER BY orden ASC, label ASC',
            [categoria]
        );

        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error al obtener catálogo:', error);
        res.status(500).json({ success: false, message: 'Error al obtener catálogo' });
    }
};

// Obtener todas las categorías disponibles (admin)
exports.obtenerCategorias = async (req, res) => {
    try {
        const [rows] = await db.pool.execute(
            `SELECT categoria, COUNT(*) as total,
                    SUM(CASE WHEN activo = 1 THEN 1 ELSE 0 END) as activos
             FROM catalogos
             GROUP BY categoria
             ORDER BY categoria ASC`
        );

        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error al obtener categorías:', error);
        res.status(500).json({ success: false, message: 'Error al obtener categorías' });
    }
};

// Obtener todas las opciones de una categoría (incluye inactivas — admin)
exports.obtenerTodasPorCategoria = async (req, res) => {
    try {
        const { categoria } = req.params;

        const [rows] = await db.pool.execute(
            'SELECT id, categoria, valor, label, orden, activo FROM catalogos WHERE categoria = ? ORDER BY orden ASC, label ASC',
            [categoria]
        );

        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error al obtener opciones:', error);
        res.status(500).json({ success: false, message: 'Error al obtener opciones' });
    }
};

// Crear nueva opción (admin)
exports.crearOpcion = async (req, res) => {
    try {
        const { categoria, valor, label, orden } = req.body;

        if (!categoria || !valor || !label) {
            return res.status(400).json({
                success: false,
                message: 'Se requieren: categoria, valor y label'
            });
        }

        // Generar valor slug si no se proporciona uno limpio
        const valorLimpio = valor.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

        const [result] = await db.pool.execute(
            'INSERT INTO catalogos (categoria, valor, label, orden) VALUES (?, ?, ?, ?)',
            [categoria.trim(), valorLimpio, label.trim(), orden || 0]
        );

        res.status(201).json({
            success: true,
            message: 'Opción creada exitosamente',
            data: { id: result.insertId, categoria: categoria.trim(), valor: valorLimpio, label: label.trim(), orden: orden || 0 }
        });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: 'Ya existe una opción con ese valor en esta categoría' });
        }
        console.error('Error al crear opción:', error);
        res.status(500).json({ success: false, message: 'Error al crear opción' });
    }
};

// Editar opción existente (admin)
exports.editarOpcion = async (req, res) => {
    try {
        const { id } = req.params;
        const { label, orden, activo } = req.body;

        const campos = [];
        const valores = [];

        if (label !== undefined) {
            campos.push('label = ?');
            valores.push(label.trim());
        }
        if (orden !== undefined) {
            campos.push('orden = ?');
            valores.push(orden);
        }
        if (activo !== undefined) {
            campos.push('activo = ?');
            valores.push(activo ? 1 : 0);
        }

        if (campos.length === 0) {
            return res.status(400).json({ success: false, message: 'No se enviaron campos para actualizar' });
        }

        valores.push(id);

        const [result] = await db.pool.execute(
            `UPDATE catalogos SET ${campos.join(', ')} WHERE id = ?`,
            valores
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Opción no encontrada' });
        }

        res.json({ success: true, message: 'Opción actualizada' });
    } catch (error) {
        console.error('Error al editar opción:', error);
        res.status(500).json({ success: false, message: 'Error al editar opción' });
    }
};

// Desactivar opción (soft delete — admin)
exports.eliminarOpcion = async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await db.pool.execute(
            'UPDATE catalogos SET activo = 0 WHERE id = ?',
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Opción no encontrada' });
        }

        res.json({ success: true, message: 'Opción desactivada' });
    } catch (error) {
        console.error('Error al desactivar opción:', error);
        res.status(500).json({ success: false, message: 'Error al desactivar opción' });
    }
};

// Reactivar opción (admin)
exports.reactivarOpcion = async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await db.pool.execute(
            'UPDATE catalogos SET activo = 1 WHERE id = ?',
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Opción no encontrada' });
        }

        res.json({ success: true, message: 'Opción reactivada' });
    } catch (error) {
        console.error('Error al reactivar opción:', error);
        res.status(500).json({ success: false, message: 'Error al reactivar opción' });
    }
};
