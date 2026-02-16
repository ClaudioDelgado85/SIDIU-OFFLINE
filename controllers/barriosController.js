const db = require('../config/database');

// Obtener todos los barrios (para selects)
exports.obtenerBarrios = async (req, res) => {
    try {
        const [rows] = await db.pool.execute(
            'SELECT id, nombre FROM barrios WHERE activo = 1 ORDER BY nombre ASC'
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error al obtener barrios:', error);
        res.status(500).json({ success: false, message: 'Error al obtener barrios' });
    }
};

// Crear barrio (Admin)
exports.crearBarrio = async (req, res) => {
    try {
        const { nombre } = req.body;
        if (!nombre || nombre.trim().length < 2) {
            return res.status(400).json({ success: false, message: 'El nombre del barrio es requerido' });
        }

        const [result] = await db.pool.execute(
            'INSERT INTO barrios (nombre) VALUES (?)',
            [nombre.trim()]
        );

        res.status(201).json({
            success: true,
            message: 'Barrio creado exitosamente',
            data: { id: result.insertId, nombre: nombre.trim() }
        });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: 'Ya existe un barrio con ese nombre' });
        }
        console.error('Error al crear barrio:', error);
        res.status(500).json({ success: false, message: 'Error al crear barrio' });
    }
};

// Editar barrio (Admin)
exports.editarBarrio = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre } = req.body;

        const [result] = await db.pool.execute(
            'UPDATE barrios SET nombre = ? WHERE id = ?',
            [nombre.trim(), id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Barrio no encontrado' });
        }

        res.json({ success: true, message: 'Barrio actualizado' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: 'Ya existe un barrio con ese nombre' });
        }
        console.error('Error al editar barrio:', error);
        res.status(500).json({ success: false, message: 'Error al editar barrio' });
    }
};

// Desactivar barrio (Admin) - soft delete
exports.eliminarBarrio = async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await db.pool.execute(
            'UPDATE barrios SET activo = 0 WHERE id = ?',
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Barrio no encontrado' });
        }

        res.json({ success: true, message: 'Barrio desactivado' });
    } catch (error) {
        console.error('Error al eliminar barrio:', error);
        res.status(500).json({ success: false, message: 'Error al eliminar barrio' });
    }
};
