// controllers/tareasController.js
// CRUD para tareas diarias

const db = require('../config/database');

// Obtener tareas por fecha
exports.obtenerPorFecha = async (req, res) => {
    try {
        const { fecha } = req.query;
        if (!fecha) {
            return res.status(400).json({ success: false, message: 'Se requiere el parámetro "fecha"' });
        }

        const sql = `
            SELECT t.*, c.label AS categoria_nombre, b.nombre AS barrio_nombre
            FROM tareas_diarias t
            LEFT JOIN catalogos c ON t.categoria_id = c.id
            LEFT JOIN barrios b ON t.barrio_id = b.id
            WHERE t.fecha = ?
            ORDER BY t.fecha_creacion ASC
        `;

        const [rows] = await db.pool.execute(sql, [fecha]);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error al obtener tareas:', error);
        res.status(500).json({ success: false, message: 'Error al obtener tareas' });
    }
};

// Crear tarea
exports.crearTarea = async (req, res) => {
    try {
        const { fecha, titulo, descripcion, direccion, categoria_id, barrio_id } = req.body;

        if (!fecha || !titulo || !descripcion || !categoria_id) {
            return res.status(400).json({
                success: false,
                message: 'Faltan campos obligatorios (fecha, titulo, descripcion, categoria_id)'
            });
        }

        const sql = `
            INSERT INTO tareas_diarias (fecha, titulo, descripcion, direccion, categoria_id, barrio_id)
            VALUES (?, ?, ?, ?, ?, ?)
        `;

        const values = [fecha, titulo, descripcion, direccion || null, categoria_id, barrio_id || null];
        const [result] = await db.pool.execute(sql, values);

        res.status(201).json({
            success: true,
            message: 'Tarea creada exitosamente',
            data: { id: result.insertId, ...req.body }
        });
    } catch (error) {
        console.error('Error al crear tarea:', error);
        res.status(500).json({ success: false, message: 'Error al crear tarea' });
    }
};

// Actualizar tarea
exports.actualizarTarea = async (req, res) => {
    try {
        const { id } = req.params;
        const { fecha, titulo, descripcion, direccion, categoria_id, barrio_id } = req.body;

        const campos = [];
        const valores = [];

        if (fecha !== undefined) { campos.push('fecha = ?'); valores.push(fecha); }
        if (titulo !== undefined) { campos.push('titulo = ?'); valores.push(titulo); }
        if (descripcion !== undefined) { campos.push('descripcion = ?'); valores.push(descripcion); }
        if (direccion !== undefined) { campos.push('direccion = ?'); valores.push(direccion || null); }
        if (categoria_id !== undefined) { campos.push('categoria_id = ?'); valores.push(categoria_id); }
        if (barrio_id !== undefined) { campos.push('barrio_id = ?'); valores.push(barrio_id || null); }

        if (campos.length === 0) {
            return res.status(400).json({ success: false, message: 'No se enviaron campos para actualizar' });
        }

        valores.push(id);
        const [result] = await db.pool.execute(`UPDATE tareas_diarias SET ${campos.join(', ')} WHERE id = ?`, valores);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Tarea no encontrada' });
        }

        res.json({ success: true, message: 'Tarea actualizada exitosamente' });
    } catch (error) {
        console.error('Error al actualizar tarea:', error);
        res.status(500).json({ success: false, message: 'Error al actualizar tarea' });
    }
};

// Eliminar tarea
exports.eliminarTarea = async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await db.pool.execute('DELETE FROM tareas_diarias WHERE id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Tarea no encontrada' });
        }

        res.json({ success: true, message: 'Tarea eliminada exitosamente' });
    } catch (error) {
        console.error('Error al eliminar tarea:', error);
        res.status(500).json({ success: false, message: 'Error al eliminar tarea' });
    }
};
