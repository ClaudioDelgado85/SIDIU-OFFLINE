-- ============================================
-- SCHEMA: Base de Datos gestion_municipal
-- Regenerado desde BD real: 2026-02-13
-- Motor: InnoDB | Charset: utf8mb4_unicode_ci
-- ============================================

CREATE DATABASE IF NOT EXISTS gestion_municipal;
USE gestion_municipal;

-- ============================================
-- TABLAS AUXILIARES / CATÁLOGOS
-- ============================================

-- Tabla: barrios (catálogo normalizado de barrios)
CREATE TABLE IF NOT EXISTS `barrios` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `activo` tinyint(1) DEFAULT 1,
  `fecha_creacion` timestamp NOT NULL DEFAULT current_timestamp(),
  `fecha_actualizacion` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: contador_reclamos (secuencia para números de reclamo)
CREATE TABLE IF NOT EXISTS `contador_reclamos` (
  `anio` int(11) NOT NULL,
  `ultimo_numero` int(11) DEFAULT 0,
  PRIMARY KEY (`anio`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLA: usuarios
-- ============================================

CREATE TABLE IF NOT EXISTS `usuarios` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nombre_completo` varchar(255) NOT NULL,
  `usuario` varchar(100) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `rol` enum('admin_total','carga','consulta') NOT NULL,
  `activo` tinyint(1) DEFAULT 1,
  `fecha_creacion` timestamp NOT NULL DEFAULT current_timestamp(),
  `fecha_actualizacion` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `usuario` (`usuario`),
  UNIQUE KEY `idx_email_unico` (`email`),
  KEY `idx_usuario` (`usuario`),
  KEY `idx_rol` (`rol`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLA: expedientes
-- ============================================

CREATE TABLE IF NOT EXISTS `expedientes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `fecha` date NOT NULL,
  `numero_expediente` varchar(50) NOT NULL,
  `nombre_apellido` varchar(255) NOT NULL,
  `dni` varchar(20) NOT NULL,
  `motivo` text NOT NULL,
  `direccion` varchar(255) DEFAULT NULL,
  `numero_partida` varchar(50) DEFAULT NULL,
  `estado` enum('ingreso','en_inspeccion','plazo_otorgado','salida') NOT NULL DEFAULT 'ingreso',
  `fecha_inspeccion` date DEFAULT NULL,
  `plazo_dias` int(11) DEFAULT NULL,
  `fecha_salida` date DEFAULT NULL,
  `observaciones` text DEFAULT NULL,
  `fecha_creacion` timestamp NOT NULL DEFAULT current_timestamp(),
  `fecha_actualizacion` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `barrio_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `numero_expediente` (`numero_expediente`),
  KEY `idx_numero_expediente` (`numero_expediente`),
  KEY `idx_dni` (`dni`),
  KEY `idx_nombre` (`nombre_apellido`),
  KEY `idx_fecha` (`fecha`),
  KEY `idx_estado` (`estado`),
  CONSTRAINT `fk_expedientes_barrio` FOREIGN KEY (`barrio_id`) REFERENCES `barrios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLA: infracciones
-- ============================================

CREATE TABLE IF NOT EXISTS `infracciones` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `fecha` date NOT NULL,
  `nombre_apellido` varchar(255) NOT NULL,
  `dni` varchar(20) NOT NULL,
  `numero_acta` varchar(50) NOT NULL,
  `direccion` text NOT NULL,
  `motivo_infraccion` text NOT NULL,
  `observaciones` text DEFAULT NULL,
  `fecha_creacion` timestamp NOT NULL DEFAULT current_timestamp(),
  `fecha_actualizacion` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `barrio_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `numero_acta` (`numero_acta`),
  KEY `idx_numero_acta` (`numero_acta`),
  KEY `idx_dni` (`dni`),
  KEY `idx_nombre` (`nombre_apellido`),
  KEY `idx_fecha` (`fecha`),
  CONSTRAINT `fk_infracciones_barrio` FOREIGN KEY (`barrio_id`) REFERENCES `barrios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLA: intimaciones
-- Polimórfica: campos condicionales según tipo
--   general  → tipo_obstruccion
--   baldio   → infraccion_realizada, propietario_no_ubicado
--   vehiculo → marca, modelo, color, dominio, etc.
-- ============================================

CREATE TABLE IF NOT EXISTS `intimaciones` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `fecha` date NOT NULL,
  `tipo` enum('general','baldio','vehiculo') NOT NULL,
  `nombre_apellido` varchar(100) NOT NULL,
  `dni` varchar(20) NOT NULL,
  `direccion` varchar(200) NOT NULL,
  `tipo_obstruccion` varchar(100) DEFAULT NULL,
  `plazo_dias` int(11) DEFAULT 0,
  `numero_intimacion` int(11) DEFAULT 1,
  `dio_cumplimiento` tinyint(1) DEFAULT 0,
  `fecha_subsanacion` date DEFAULT NULL,
  `observaciones` text DEFAULT NULL,
  `estado` enum('vigente','proxima_vencer','vencida','cumplida') DEFAULT 'vigente',
  -- Campos Baldíos
  `infraccion_realizada` tinyint(1) DEFAULT 0,
  `numero_infraccion` varchar(50) DEFAULT NULL,
  `fecha_infraccion` date DEFAULT NULL,
  `propietario_no_ubicado` tinyint(1) DEFAULT 0,
  -- Campos Vehículos
  `marca` varchar(50) DEFAULT NULL,
  `modelo` varchar(50) DEFAULT NULL,
  `color` varchar(30) DEFAULT NULL,
  `dominio` varchar(20) DEFAULT NULL,
  `fecha_retiro` date DEFAULT NULL,
  `lugar_deposito` varchar(200) DEFAULT NULL,
  -- Timestamps
  `fecha_creacion` timestamp NOT NULL DEFAULT current_timestamp(),
  `fecha_actualizacion` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `barrio_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_estado` (`estado`),
  KEY `idx_tipo` (`tipo`),
  KEY `idx_fecha` (`fecha`),
  KEY `idx_dni` (`dni`),
  KEY `idx_nombre` (`nombre_apellido`),
  CONSTRAINT `fk_intimaciones_barrio` FOREIGN KEY (`barrio_id`) REFERENCES `barrios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLA: reclamos
-- ============================================

CREATE TABLE IF NOT EXISTS `reclamos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `numero_reclamo` varchar(20) NOT NULL,
  `fecha_creacion` timestamp NOT NULL DEFAULT current_timestamp(),
  `tipo_reclamo` enum('alumbrado','baldio','ruidos','animales','cloacas','obras','varios') NOT NULL,
  `descripcion` text NOT NULL,
  `direccion_incidente` varchar(255) NOT NULL,
  -- Datos del denunciado (opcional)
  `denunciado_nombre` varchar(255) DEFAULT NULL,
  `denunciado_dni` varchar(20) DEFAULT NULL,
  `denunciado_direccion` text DEFAULT NULL,
  -- Adjuntos
  `foto_url` varchar(255) DEFAULT NULL,
  -- Datos del vecino reclamante
  `vecino_nombre` varchar(100) DEFAULT NULL,
  `vecino_telefono` varchar(50) DEFAULT NULL,
  -- Estado y resolución
  `estado` enum('pendiente','en_proceso','resuelto','anulado') DEFAULT 'pendiente',
  `prioridad` enum('baja','media','alta','urgente') DEFAULT 'media',
  `fecha_resolucion` date DEFAULT NULL,
  `observaciones_resolucion` text DEFAULT NULL,
  -- Relaciones
  `usuario_creador_id` int(11) DEFAULT NULL,
  `barrio_id` int(11) DEFAULT NULL,
  `fecha_actualizacion` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `numero_reclamo` (`numero_reclamo`),
  KEY `usuario_creador_id` (`usuario_creador_id`),
  KEY `idx_estado` (`estado`),
  KEY `idx_tipo_reclamo` (`tipo_reclamo`),
  KEY `idx_fecha_creacion` (`fecha_creacion`),
  CONSTRAINT `fk_reclamos_barrio` FOREIGN KEY (`barrio_id`) REFERENCES `barrios` (`id`),
  CONSTRAINT `reclamos_ibfk_1` FOREIGN KEY (`usuario_creador_id`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLA: relevamientos
-- ============================================

CREATE TABLE IF NOT EXISTS `relevamientos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `numero_relevamiento` varchar(20) NOT NULL,
  `fecha_relevamiento` date NOT NULL,
  `tipo_relevamiento` enum('baldio','obra','ocupacion','comercio','varios') NOT NULL,
  `ubicacion` varchar(255) NOT NULL,
  `zona` varchar(100) DEFAULT NULL,
  `responsable_nombre` varchar(255) DEFAULT NULL,
  `responsable_dni` varchar(20) DEFAULT NULL,
  `observaciones` text DEFAULT NULL,
  `foto_url` varchar(255) DEFAULT NULL,
  -- Campos Ocupación Espacio Público
  `tiene_autorizacion` tinyint(1) DEFAULT 0,
  `paga_canon` tinyint(1) DEFAULT 0,
  `fecha_vencimiento_canon` date DEFAULT NULL,
  -- Timestamps
  `fecha_creacion` timestamp NOT NULL DEFAULT current_timestamp(),
  `fecha_actualizacion` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `barrio_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `numero_relevamiento` (`numero_relevamiento`),
  KEY `idx_tipo` (`tipo_relevamiento`),
  KEY `idx_responsable` (`responsable_nombre`),
  CONSTRAINT `fk_relevamientos_barrio` FOREIGN KEY (`barrio_id`) REFERENCES `barrios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- VISTAS
-- ============================================

-- Vista: Alertas de intimaciones con estado calculado
CREATE OR REPLACE VIEW vista_alertas_intimaciones AS
SELECT
    i.id, i.tipo, i.nombre_apellido, i.dni, i.direccion,
    i.fecha AS fecha_intimacion,
    DATE_ADD(i.fecha, INTERVAL i.plazo_dias DAY) AS fecha_vencimiento,
    i.plazo_dias, i.numero_intimacion, i.barrio_id,
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

-- Vista: Resumen mensual para dashboard
CREATE OR REPLACE VIEW vista_dashboard_resumen AS
SELECT
    (SELECT COUNT(*) FROM expedientes WHERE MONTH(fecha) = MONTH(CURDATE()) AND YEAR(fecha) = YEAR(CURDATE())) AS expedientes_mes,
    (SELECT COUNT(*) FROM intimaciones WHERE MONTH(fecha) = MONTH(CURDATE()) AND YEAR(fecha) = YEAR(CURDATE())) AS intimaciones_mes,
    (SELECT COUNT(*) FROM infracciones WHERE MONTH(fecha) = MONTH(CURDATE()) AND YEAR(fecha) = YEAR(CURDATE())) AS infracciones_mes,
    (SELECT COUNT(*) FROM reclamos WHERE MONTH(fecha_creacion) = MONTH(CURDATE()) AND YEAR(fecha_creacion) = YEAR(CURDATE())) AS reclamos_mes,
    (SELECT COUNT(*) FROM relevamientos WHERE MONTH(fecha_relevamiento) = MONTH(CURDATE()) AND YEAR(fecha_relevamiento) = YEAR(CURDATE())) AS relevamientos_mes,
    (SELECT COUNT(*) FROM intimaciones WHERE CURDATE() <= DATE_ADD(fecha, INTERVAL plazo_dias DAY) AND DATEDIFF(DATE_ADD(fecha, INTERVAL plazo_dias DAY), CURDATE()) <= 3 AND dio_cumplimiento = 0) AS alertas_proximas_vencer,
    (SELECT COUNT(*) FROM intimaciones WHERE CURDATE() > DATE_ADD(fecha, INTERVAL plazo_dias DAY) AND dio_cumplimiento = 0) AS alertas_vencidas,
    (SELECT COUNT(*) FROM intimaciones WHERE dio_cumplimiento = 1 AND MONTH(fecha_subsanacion) = MONTH(CURDATE()) AND YEAR(fecha_subsanacion) = YEAR(CURDATE())) AS alertas_cumplidas_mes;

-- Vista: Historial unificado del contribuyente
CREATE OR REPLACE VIEW vista_historial_contribuyente AS
SELECT 'expediente' AS tipo, e.id, e.nombre_apellido, e.dni, e.fecha AS fecha_registro, e.numero_expediente AS numero, e.motivo AS descripcion, e.estado, NULL AS direccion, e.barrio_id FROM expedientes e
UNION ALL
SELECT 'intimacion', i.id, i.nombre_apellido, i.dni, i.fecha, CONCAT(i.numero_intimacion, ' - ', i.tipo), i.tipo_obstruccion, i.estado, i.direccion, i.barrio_id FROM intimaciones i
UNION ALL
SELECT 'infraccion', inf.id, inf.nombre_apellido, inf.dni, inf.fecha, inf.numero_acta, inf.motivo_infraccion, 'registrada', inf.direccion, inf.barrio_id FROM infracciones inf
UNION ALL
SELECT 'reclamo_denunciado', r.id, r.denunciado_nombre, r.denunciado_dni, r.fecha_creacion, r.numero_reclamo, r.tipo_reclamo, r.estado, r.denunciado_direccion, r.barrio_id FROM reclamos r
UNION ALL
SELECT 'relevamiento', rel.id, rel.responsable_nombre, rel.responsable_dni, rel.fecha_relevamiento, rel.numero_relevamiento, rel.ubicacion, CASE WHEN rel.tiene_autorizacion THEN 'autorizado' ELSE 'no_autorizado' END, rel.ubicacion, rel.barrio_id FROM relevamientos rel
ORDER BY fecha_registro DESC;
