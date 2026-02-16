-- ============================================
-- MIGRACIÓN: Recrear vistas rotas
-- Fecha: 2026-02-13
-- Las 3 vistas originales referenciaban columnas
-- y tablas que ya no existen. Esta migración
-- las elimina y las recrea con la estructura actual.
-- ============================================

USE gestion_municipal;

-- ============================================
-- VISTA 1: vista_alertas_intimaciones
-- Muestra intimaciones pendientes con estado calculado y días restantes
-- ============================================

DROP VIEW IF EXISTS vista_alertas_intimaciones;

CREATE VIEW vista_alertas_intimaciones AS
SELECT
    i.id,
    i.tipo,
    i.nombre_apellido,
    i.dni,
    i.direccion,
    i.fecha AS fecha_intimacion,
    DATE_ADD(i.fecha, INTERVAL i.plazo_dias DAY) AS fecha_vencimiento,
    i.plazo_dias,
    i.numero_intimacion,
    i.barrio_id,
    CASE
        WHEN i.dio_cumplimiento = 1 THEN 'cumplida'
        WHEN CURDATE() > DATE_ADD(i.fecha, INTERVAL i.plazo_dias DAY) THEN 'vencida'
        WHEN DATEDIFF(DATE_ADD(i.fecha, INTERVAL i.plazo_dias DAY), CURDATE()) <= 3 THEN 'proxima_vencer'
        ELSE 'vigente'
    END AS estado_calculado,
    DATEDIFF(DATE_ADD(i.fecha, INTERVAL i.plazo_dias DAY), CURDATE()) AS dias_restantes
FROM intimaciones i
WHERE i.dio_cumplimiento = 0
ORDER BY fecha_vencimiento ASC;

-- ============================================
-- VISTA 2: vista_dashboard_resumen
-- Resumen mensual para el dashboard principal
-- ============================================

DROP VIEW IF EXISTS vista_dashboard_resumen;

CREATE VIEW vista_dashboard_resumen AS
SELECT
    (SELECT COUNT(*) FROM expedientes
     WHERE MONTH(fecha) = MONTH(CURDATE()) AND YEAR(fecha) = YEAR(CURDATE())
    ) AS expedientes_mes,

    (SELECT COUNT(*) FROM intimaciones
     WHERE MONTH(fecha) = MONTH(CURDATE()) AND YEAR(fecha) = YEAR(CURDATE())
    ) AS intimaciones_mes,

    (SELECT COUNT(*) FROM infracciones
     WHERE MONTH(fecha) = MONTH(CURDATE()) AND YEAR(fecha) = YEAR(CURDATE())
    ) AS infracciones_mes,

    (SELECT COUNT(*) FROM reclamos
     WHERE MONTH(fecha_creacion) = MONTH(CURDATE()) AND YEAR(fecha_creacion) = YEAR(CURDATE())
    ) AS reclamos_mes,

    (SELECT COUNT(*) FROM relevamientos
     WHERE MONTH(fecha_relevamiento) = MONTH(CURDATE()) AND YEAR(fecha_relevamiento) = YEAR(CURDATE())
    ) AS relevamientos_mes,

    (SELECT COUNT(*) FROM intimaciones
     WHERE CURDATE() <= DATE_ADD(fecha, INTERVAL plazo_dias DAY)
       AND DATEDIFF(DATE_ADD(fecha, INTERVAL plazo_dias DAY), CURDATE()) <= 3
       AND dio_cumplimiento = 0
    ) AS alertas_proximas_vencer,

    (SELECT COUNT(*) FROM intimaciones
     WHERE CURDATE() > DATE_ADD(fecha, INTERVAL plazo_dias DAY)
       AND dio_cumplimiento = 0
    ) AS alertas_vencidas,

    (SELECT COUNT(*) FROM intimaciones
     WHERE dio_cumplimiento = 1
       AND MONTH(fecha_subsanacion) = MONTH(CURDATE())
       AND YEAR(fecha_subsanacion) = YEAR(CURDATE())
    ) AS alertas_cumplidas_mes;

-- ============================================
-- VISTA 3: vista_historial_contribuyente
-- Unifica registros de todas las tablas por DNI/Nombre
-- para la ficha del contribuyente
-- ============================================

DROP VIEW IF EXISTS vista_historial_contribuyente;

CREATE VIEW vista_historial_contribuyente AS
-- Expedientes
SELECT
    'expediente' AS tipo,
    e.id,
    e.nombre_apellido,
    e.dni,
    e.fecha AS fecha_registro,
    e.numero_expediente AS numero,
    e.motivo AS descripcion,
    e.estado,
    NULL AS direccion,
    e.barrio_id
FROM expedientes e

UNION ALL

-- Intimaciones
SELECT
    'intimacion' AS tipo,
    i.id,
    i.nombre_apellido,
    i.dni,
    i.fecha AS fecha_registro,
    CONCAT(i.numero_intimacion, ' - ', i.tipo) AS numero,
    i.tipo_obstruccion AS descripcion,
    i.estado,
    i.direccion,
    i.barrio_id
FROM intimaciones i

UNION ALL

-- Infracciones
SELECT
    'infraccion' AS tipo,
    inf.id,
    inf.nombre_apellido,
    inf.dni,
    inf.fecha AS fecha_registro,
    inf.numero_acta AS numero,
    inf.motivo_infraccion AS descripcion,
    'registrada' AS estado,
    inf.direccion,
    inf.barrio_id
FROM infracciones inf

UNION ALL

-- Reclamos (por denunciado)
SELECT
    'reclamo_denunciado' AS tipo,
    r.id,
    r.denunciado_nombre AS nombre_apellido,
    r.denunciado_dni AS dni,
    r.fecha_creacion AS fecha_registro,
    r.numero_reclamo AS numero,
    r.tipo_reclamo AS descripcion,
    r.estado,
    r.denunciado_direccion AS direccion,
    r.barrio_id
FROM reclamos r

UNION ALL

-- Relevamientos
SELECT
    'relevamiento' AS tipo,
    rel.id,
    rel.responsable_nombre AS nombre_apellido,
    rel.responsable_dni AS dni,
    rel.fecha_relevamiento AS fecha_registro,
    rel.numero_relevamiento AS numero,
    rel.ubicacion AS descripcion,
    CASE WHEN rel.tiene_autorizacion THEN 'autorizado' ELSE 'no_autorizado' END AS estado,
    rel.ubicacion AS direccion,
    rel.barrio_id
FROM relevamientos rel

ORDER BY fecha_registro DESC;
