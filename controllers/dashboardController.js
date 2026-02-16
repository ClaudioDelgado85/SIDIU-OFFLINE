const db = require('../config/database');

exports.obtenerResumenDashboard = async (req, res) => {
    try {
        // 1. KPIs Generales
        // Intimaciones: Vencidas (Ya expiró plazo) vs Próximas (Vencen en <= 3 días)
        const [intimacionesVencidas] = await db.pool.execute(
            "SELECT COUNT(*) as total FROM intimaciones WHERE estado = 'vigente' AND DATE_ADD(fecha, INTERVAL plazo_dias DAY) < CURDATE()"
        );
        const [intimacionesProximas] = await db.pool.execute(
            "SELECT COUNT(*) as total FROM intimaciones WHERE estado = 'vigente' AND DATE_ADD(fecha, INTERVAL plazo_dias DAY) BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 3 DAY)"
        );

        // Reclamos: Pendientes (Nuevos) vs En Proceso
        const [reclamosPendientes] = await db.pool.execute(
            "SELECT COUNT(*) as total FROM reclamos WHERE estado = 'pendiente'"
        );
        const [reclamosEnProceso] = await db.pool.execute(
            "SELECT COUNT(*) as total FROM reclamos WHERE estado = 'en_proceso'"
        );

        // Expedientes del Mes Actual
        const [expedientesMes] = await db.pool.execute(
            "SELECT COUNT(*) as total FROM expedientes WHERE MONTH(fecha) = MONTH(CURDATE()) AND YEAR(fecha) = YEAR(CURDATE())"
        );

        // Infracciones del Mes Actual
        const [infraccionesMes] = await db.pool.execute(
            "SELECT COUNT(*) as total FROM infracciones WHERE MONTH(fecha) = MONTH(CURDATE()) AND YEAR(fecha) = YEAR(CURDATE())"
        );

        // 2. Gráficos
        // Reclamos por Tipo
        const [reclamosPorTipo] = await db.pool.execute(
            "SELECT tipo_reclamo, COUNT(*) as total FROM reclamos GROUP BY tipo_reclamo"
        );

        // Intimaciones por Estado
        const [intimacionesPorEstado] = await db.pool.execute(
            "SELECT estado, COUNT(*) as total FROM intimaciones GROUP BY estado"
        );

        // 3. Tablas de Acción (Últimas 5)
        // Próximos Vencimientos (Vence en los próximos 7 días)
        const [proximosVencimientos] = await db.pool.execute(`
            SELECT id, fecha, tipo, nombre_apellido, 
                   DATEDIFF(DATE_ADD(fecha, INTERVAL plazo_dias DAY), CURDATE()) as dias_restantes
            FROM intimaciones 
            WHERE estado = 'vigente' 
            AND DATE_ADD(fecha, INTERVAL plazo_dias DAY) BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
            ORDER BY dias_restantes ASC
            LIMIT 5
        `);

        // Últimos Reclamos
        const [ultimosReclamos] = await db.pool.execute(
            "SELECT id, fecha_creacion as fecha, tipo_reclamo, descripcion, estado FROM reclamos ORDER BY fecha_creacion DESC LIMIT 5"
        );


        res.json({
            success: true,
            data: {
                kpis: {
                    intimaciones_vencidas: intimacionesVencidas[0].total,
                    intimaciones_proximas: intimacionesProximas[0].total,
                    reclamos_pendientes: reclamosPendientes[0].total,
                    reclamos_proceso: reclamosEnProceso[0].total,
                    expedientes_mes: expedientesMes[0].total,
                    infracciones_mes: infraccionesMes[0].total
                },
                graficos: {
                    reclamos_tipo: reclamosPorTipo,
                    intimaciones_estado: intimacionesPorEstado
                },
                tablas: {
                    vencimientos: proximosVencimientos,
                    recientes: ultimosReclamos
                }
            }
        });

    } catch (error) {
        console.error('Error dashboard:', error);
        res.status(500).json({ success: false, message: 'Error al obtener datos del dashboard' });
    }
};
