const db = require('../config/database');

exports.obtenerResumenDashboard = async (req, res) => {
    try {
        // ─── KPIs ────────────────────────────────────

        // Intimaciones vencidas (excluye reiterada y cumplida)
        const [intimVencidas] = await db.pool.execute(
            `SELECT COUNT(*) as total FROM intimaciones
             WHERE dio_cumplimiento = 0
             AND estado NOT IN ('reiterada', 'infraccionado')
             AND DATE_ADD(fecha, INTERVAL plazo_dias DAY) < CURDATE()`
        );

        // Intimaciones próximas a vencer (≤ 3 días)
        const [intimProximas] = await db.pool.execute(
            `SELECT COUNT(*) as total FROM intimaciones
             WHERE dio_cumplimiento = 0
             AND estado NOT IN ('reiterada', 'infraccionado')
             AND DATE_ADD(fecha, INTERVAL plazo_dias DAY) BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 3 DAY)`
        );

        // Expedientes con plazo otorgado
        const [expPlazo] = await db.pool.execute(
            `SELECT COUNT(*) as total FROM expedientes WHERE estado = 'plazo_otorgado'`
        );

        // Reclamos pendientes
        const [recPendientes] = await db.pool.execute(
            `SELECT COUNT(*) as total FROM reclamos WHERE estado = 'pendiente'`
        );

        // Reclamos en proceso
        const [recEnProceso] = await db.pool.execute(
            `SELECT COUNT(*) as total FROM reclamos WHERE estado = 'en_proceso'`
        );

        // ─── TARJETAS DE ESCALAMIENTO ────────────────
        // Intimaciones vencidas agrupadas por numero_intimacion y tipo
        const [escalamiento] = await db.pool.execute(`
            SELECT
                numero_intimacion,
                tipo,
                COUNT(*) as total
            FROM intimaciones
            WHERE dio_cumplimiento = 0
              AND estado NOT IN ('reiterada', 'infraccionado')
              AND DATE_ADD(fecha, INTERVAL plazo_dias DAY) < CURDATE()
            GROUP BY numero_intimacion, tipo
            ORDER BY numero_intimacion ASC, tipo ASC
        `);

        // ─── RECLAMOS POR PRIORIDAD ──────────────────
        const [recDetalle] = await db.pool.execute(`
            SELECT r.id, r.numero_reclamo, r.tipo_reclamo, r.descripcion,
                   r.direccion_incidente, r.prioridad, r.estado,
                   r.fecha_creacion,
                   DATEDIFF(CURDATE(), r.fecha_creacion) AS dias_sin_resolver,
                   b.nombre AS barrio_nombre
            FROM reclamos r
            LEFT JOIN barrios b ON r.barrio_id = b.id
            WHERE r.estado IN ('pendiente', 'en_proceso')
            ORDER BY FIELD(r.prioridad, 'urgente', 'alta', 'media', 'baja') ASC,
                     r.fecha_creacion ASC
            LIMIT 10
        `);

        // ─── RESPUESTA ──────────────────────────────

        res.json({
            success: true,
            data: {
                kpis: {
                    intimaciones_vencidas: intimVencidas[0].total,
                    intimaciones_proximas: intimProximas[0].total,
                    expedientes_plazo: expPlazo[0].total,
                    reclamos_pendientes: recPendientes[0].total,
                    reclamos_proceso: recEnProceso[0].total
                },
                escalamiento,
                tablas: {
                    reclamos_prioridad: recDetalle
                }
            }
        });

    } catch (error) {
        console.error('Error dashboard:', error);
        res.status(500).json({ success: false, message: 'Error al obtener datos del dashboard' });
    }
};
