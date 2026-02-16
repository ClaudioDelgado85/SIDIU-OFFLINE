const db = require('../config/database');

// Búsqueda global en todas las tablas
exports.buscarGlobal = async (req, res) => {
    try {
        const { q } = req.query;

        if (!q || q.length < 3) {
            return res.status(400).json({
                success: false,
                message: 'El término de búsqueda debe tener al menos 3 caracteres'
            });
        }

        const termino = `%${q}%`;
        const resultados = [];

        // Ejecutar consultas en paralelo
        const [
            expedientes,
            intimaciones,
            infracciones,
            reclamos,
            relevamientos
        ] = await Promise.all([
            // 1. Expedientes (buscar por numero, motivo, nombre, dni)
            db.pool.execute(
                `SELECT id, fecha, numero_expediente as numero, motivo as descripcion, estado, 'expediente' as tipo
                 FROM expedientes 
                 WHERE numero_expediente LIKE ? OR motivo LIKE ? OR nombre_apellido LIKE ? OR dni LIKE ?`,
                [termino, termino, termino, termino]
            ),
            // 2. Intimaciones (buscar por numero, nombre, dni)
            db.pool.execute(
                `SELECT id, fecha, numero_intimacion as numero, tipo as descripcion, estado, 'intimacion' as tipo
                 FROM intimaciones 
                 WHERE numero_intimacion LIKE ? OR nombre_apellido LIKE ? OR dni LIKE ?`,
                [termino, termino, termino]
            ),
            // 3. Infracciones (buscar por numero, nombre, dni)
            db.pool.execute(
                `SELECT id, fecha, numero_acta as numero, motivo_infraccion as descripcion, 'registrada' as estado, 'infraccion' as tipo
                 FROM infracciones 
                 WHERE numero_acta LIKE ? OR nombre_apellido LIKE ? OR dni LIKE ?`,
                [termino, termino, termino]
            ),
            // 4. Reclamos (buscar por numero, vecino, denunciado)
            db.pool.execute(
                `SELECT id, fecha_creacion as fecha, numero_reclamo as numero, tipo_reclamo as descripcion, estado, 'reclamo' as tipo
                 FROM reclamos 
                 WHERE numero_reclamo LIKE ? OR vecino_nombre LIKE ? 
                 OR denunciado_nombre LIKE ? OR denunciado_dni LIKE ?`,
                [termino, termino, termino, termino]
            ),
            // 5. Relevamientos (buscar por numero, responsable, dni, ubicacion)
            db.pool.execute(
                `SELECT id, fecha_relevamiento as fecha, numero_relevamiento as numero, tipo_relevamiento as descripcion, ubicacion, 'relevamiento' as tipo
                 FROM relevamientos 
                 WHERE numero_relevamiento LIKE ? OR responsable_nombre LIKE ? OR responsable_dni LIKE ? OR ubicacion LIKE ?`,
                [termino, termino, termino, termino]
            )
        ]);

        // Unificar resultados

        // Expedientes
        if (expedientes[0].length > 0) {
            resultados.push(...expedientes[0].map(item => ({
                id: item.id,
                tipo: 'expediente',
                numero: item.numero,
                fecha: item.fecha,
                titulo: `Expediente ${item.numero}`,
                descripcion: item.descripcion,
                estado: item.estado,
                link: `/expedientes.html?id=${item.id}`
            })));
        }

        // Intimaciones
        if (intimaciones[0].length > 0) {
            resultados.push(...intimaciones[0].map(item => ({
                id: item.id,
                tipo: 'intimacion',
                numero: item.numero,
                fecha: item.fecha,
                titulo: `Intimación ${item.numero}`,
                descripcion: `Tipo: ${item.descripcion}`,
                estado: item.estado,
                link: `/intimaciones.html?id=${item.id}`
            })));
        }

        // Infracciones
        if (infracciones[0].length > 0) {
            resultados.push(...infracciones[0].map(item => ({
                id: item.id,
                tipo: 'infraccion',
                numero: item.numero,
                fecha: item.fecha,
                titulo: `Acta Infracción ${item.numero}`,
                descripcion: item.descripcion,
                estado: item.estado,
                link: `/infracciones.html?id=${item.id}`
            })));
        }

        // Reclamos
        if (reclamos[0].length > 0) {
            resultados.push(...reclamos[0].map(item => ({
                id: item.id,
                tipo: 'reclamo',
                numero: item.numero,
                fecha: item.fecha,
                titulo: `Reclamo ${item.numero}`,
                descripcion: `Motivo: ${item.descripcion}`,
                estado: item.estado,
                link: `/reclamos.html?id=${item.id}`
            })));
        }

        // Relevamientos
        if (relevamientos[0].length > 0) {
            resultados.push(...relevamientos[0].map(item => ({
                id: item.id,
                tipo: 'relevamiento',
                numero: item.numero,
                fecha: item.fecha,
                titulo: `Relevamiento ${item.numero}`,
                descripcion: `${item.descripcion} en ${item.ubicacion}`,
                estado: 'realizado',
                link: `/relevamientos.html?id=${item.id}`
            })));
        }

        // Ordenar por fecha descendente
        resultados.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

        res.json({
            success: true,
            total: resultados.length,
            data: resultados
        });

    } catch (error) {
        console.error('Error en búsqueda global:', error);
        res.status(500).json({
            success: false,
            message: 'Error al realizar la búsqueda',
            error: error.message
        });
    }
};
