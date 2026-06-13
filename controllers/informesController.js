// controllers/informesController.js
// Controlador para generar informes consolidados

const db = require('../config/database');
const { generarDocx } = require('../services/docxService');

// Generar informe diario consolidado
exports.informeDiario = async (req, res) => {
    try {
        const { fecha } = req.query;
        if (!fecha) {
            return res.status(400).json({ success: false, message: 'Se requiere el parámetro "fecha"' });
        }

        // Tareas diarias
        const [tareas] = await db.pool.execute(`
            SELECT t.*, c.label AS categoria_nombre, b.nombre AS barrio_nombre
            FROM tareas_diarias t
            LEFT JOIN catalogos c ON t.categoria_id = c.id
            LEFT JOIN barrios b ON t.barrio_id = b.id
            WHERE t.fecha = ?
            ORDER BY t.fecha_creacion ASC
        `, [fecha]);

        // Expedientes
        const [expedientes] = await db.pool.execute(`
            SELECT e.*, b.nombre AS barrio_nombre
            FROM expedientes e
            LEFT JOIN barrios b ON e.barrio_id = b.id
            WHERE e.fecha = ? OR e.fecha_inspeccion = ? OR e.fecha_salida = ?
            ORDER BY e.numero_expediente ASC
        `, [fecha, fecha, fecha]);

        // Intimaciones con etiquetas de catálogos
        const [intimaciones] = await db.pool.execute(`
            SELECT i.*, b.nombre AS barrio_nombre,
                   t.label AS tipo_label,
                   o.label AS tipo_obstruccion_label,
                   r.label AS rubro_comercial_label
            FROM intimaciones i
            LEFT JOIN barrios b ON i.barrio_id = b.id
            LEFT JOIN catalogos t ON t.categoria = 'tipo_intimacion' AND t.valor = i.tipo
            LEFT JOIN catalogos o ON o.categoria = 'intimacion_por' AND o.valor = i.tipo_obstruccion
            LEFT JOIN catalogos r ON r.categoria = 'rubro_comercial' AND r.valor = i.rubro_comercial
            WHERE i.fecha = ?
            ORDER BY i.id ASC
        `, [fecha]);

        // Infracciones
        const [infracciones] = await db.pool.execute(`
            SELECT inf.*, b.nombre AS barrio_nombre
            FROM infracciones inf
            LEFT JOIN barrios b ON inf.barrio_id = b.id
            WHERE inf.fecha = ?
            ORDER BY inf.numero_acta ASC
        `, [fecha]);

        // Reclamos
        const [reclamos] = await db.pool.execute(`
            SELECT r.*, b.nombre AS barrio_nombre
            FROM reclamos r
            LEFT JOIN barrios b ON r.barrio_id = b.id
            WHERE DATE(r.fecha_creacion) = ?
            ORDER BY r.numero_reclamo ASC
        `, [fecha]);

        // Relevamientos
        const [relevamientos] = await db.pool.execute(`
            SELECT rel.*, b.nombre AS barrio_nombre
            FROM relevamientos rel
            LEFT JOIN barrios b ON rel.barrio_id = b.id
            WHERE rel.fecha_relevamiento = ?
            ORDER BY rel.numero_relevamiento ASC
        `, [fecha]);

        // Comercios
        const [comercios] = await db.pool.execute(`
            SELECT c.*, b.nombre AS barrio_nombre
            FROM comercios c
            LEFT JOIN barrios b ON c.barrio_id = b.id
            WHERE c.fecha_relevamiento = ?
            ORDER BY c.id ASC
        `, [fecha]);

        // Vendedores ambulantes
        const [vendedores] = await db.pool.execute(`
            SELECT v.*, b.nombre AS barrio_nombre
            FROM vendedores_ambulantes v
            LEFT JOIN barrios b ON v.barrio_id = b.id
            WHERE v.fecha_relevamiento = ?
            ORDER BY v.id ASC
        `, [fecha]);

        res.json({
            success: true,
            data: {
                fecha,
                tareas,
                expedientes,
                intimaciones,
                infracciones,
                reclamos,
                relevamientos,
                comercios,
                vendedores,
                resumen: {
                    total_tareas: tareas.length,
                    total_expedientes: expedientes.length,
                    total_intimaciones: intimaciones.length,
                    total_infracciones: infracciones.length,
                    total_reclamos: reclamos.length,
                    total_relevamientos: relevamientos.length,
                    total_comercios: comercios.length,
                    total_vendedores: vendedores.length
                }
            }
        });
    } catch (error) {
        console.error('Error al generar informe diario:', error);
        res.status(500).json({ success: false, message: 'Error al generar informe diario' });
    }
};

// Exportar informe diario a Word (.docx)
exports.exportarDocx = async (req, res) => {
    try {
        const { fecha } = req.query;
        if (!fecha) {
            return res.status(400).json({ success: false, message: 'Se requiere el parámetro "fecha"' });
        }

        // Reutilizar datos del informe diario
        const [tareas] = await db.pool.execute(`
            SELECT t.*, c.label AS categoria_nombre, b.nombre AS barrio_nombre
            FROM tareas_diarias t
            LEFT JOIN catalogos c ON t.categoria_id = c.id
            LEFT JOIN barrios b ON t.barrio_id = b.id
            WHERE t.fecha = ? ORDER BY t.fecha_creacion ASC
        `, [fecha]);

        const [expedientes] = await db.pool.execute(`
            SELECT e.*, b.nombre AS barrio_nombre
            FROM expedientes e LEFT JOIN barrios b ON e.barrio_id = b.id
            WHERE e.fecha = ? OR e.fecha_inspeccion = ? OR e.fecha_salida = ?
            ORDER BY e.numero_expediente ASC
        `, [fecha, fecha, fecha]);

        const [intimaciones] = await db.pool.execute(`
            SELECT i.*, b.nombre AS barrio_nombre,
                   t.label AS tipo_label,
                   o.label AS tipo_obstruccion_label,
                   r.label AS rubro_comercial_label
            FROM intimaciones i
            LEFT JOIN barrios b ON i.barrio_id = b.id
            LEFT JOIN catalogos t ON t.categoria = 'tipo_intimacion' AND t.valor = i.tipo
            LEFT JOIN catalogos o ON o.categoria = 'intimacion_por' AND o.valor = i.tipo_obstruccion
            LEFT JOIN catalogos r ON r.categoria = 'rubro_comercial' AND r.valor = i.rubro_comercial
            WHERE i.fecha = ? ORDER BY i.id ASC
        `, [fecha]);

        const [infracciones] = await db.pool.execute(`
            SELECT inf.*, b.nombre AS barrio_nombre
            FROM infracciones inf LEFT JOIN barrios b ON inf.barrio_id = b.id
            WHERE inf.fecha = ? ORDER BY inf.numero_acta ASC
        `, [fecha]);

        const [reclamos] = await db.pool.execute(`
            SELECT r.*, b.nombre AS barrio_nombre
            FROM reclamos r LEFT JOIN barrios b ON r.barrio_id = b.id
            WHERE DATE(r.fecha_creacion) = ? ORDER BY r.numero_reclamo ASC
        `, [fecha]);

        const [relevamientos] = await db.pool.execute(`
            SELECT rel.*, b.nombre AS barrio_nombre
            FROM relevamientos rel LEFT JOIN barrios b ON rel.barrio_id = b.id
            WHERE rel.fecha_relevamiento = ? ORDER BY rel.numero_relevamiento ASC
        `, [fecha]);

        const [comercios] = await db.pool.execute(`
            SELECT c.*, b.nombre AS barrio_nombre
            FROM comercios c LEFT JOIN barrios b ON c.barrio_id = b.id
            WHERE c.fecha_relevamiento = ? ORDER BY c.id ASC
        `, [fecha]);

        const [vendedores] = await db.pool.execute(`
            SELECT v.*, b.nombre AS barrio_nombre
            FROM vendedores_ambulantes v LEFT JOIN barrios b ON v.barrio_id = b.id
            WHERE v.fecha_relevamiento = ? ORDER BY v.id ASC
        `, [fecha]);

        const data = {
            fecha,
            tareas, expedientes, intimaciones, infracciones,
            reclamos, relevamientos, comercios, vendedores,
            resumen: {
                total_tareas: tareas.length,
                total_expedientes: expedientes.length,
                total_intimaciones: intimaciones.length,
                total_infracciones: infracciones.length,
                total_reclamos: reclamos.length,
                total_relevamientos: relevamientos.length,
                total_comercios: comercios.length,
                total_vendedores: vendedores.length
            }
        };

        const buffer = await generarDocx(data);
        const [y, m, d] = fecha.split('-');
        const filename = `Informe_Diario_${d}-${m}-${y}.docx`;

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(buffer);

    } catch (error) {
        console.error('Error al generar Word:', error);
        res.status(500).json({ success: false, message: 'Error al generar el documento Word' });
    }
};
