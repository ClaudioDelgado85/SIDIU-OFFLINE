-- ============================================
-- MIGRACIÓN: Crear tablas comercios y vendedores_ambulantes
-- Fecha: 2026-02-22
-- Descripción: Separa relevamientos en módulos específicos
-- ============================================

USE gestion_municipal;

-- ============================================
-- TABLA: comercios (Relevamientos de Locales Comerciales)
-- ============================================

CREATE TABLE IF NOT EXISTS `comercios` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `fecha_relevamiento` date NOT NULL,
  `nombre_propietario` varchar(255) DEFAULT NULL,
  `dni_propietario` varchar(20) DEFAULT NULL,
  `direccion_comercial` varchar(255) NOT NULL,
  `rubro` varchar(100) DEFAULT NULL,
  `esta_habilitado` tinyint(1) DEFAULT 0,
  `numero_resolucion` varchar(50) DEFAULT NULL,
  `necesita_reempadronamiento` tinyint(1) DEFAULT 0,
  `observaciones` text DEFAULT NULL,
  `barrio_id` int(11) DEFAULT NULL,
  `fecha_creacion` timestamp NOT NULL DEFAULT current_timestamp(),
  `fecha_actualizacion` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_comercios_propietario` (`nombre_propietario`),
  KEY `idx_comercios_dni` (`dni_propietario`),
  KEY `idx_comercios_rubro` (`rubro`),
  KEY `idx_comercios_habilitado` (`esta_habilitado`),
  KEY `idx_comercios_fecha` (`fecha_relevamiento`),
  CONSTRAINT `fk_comercios_barrio` FOREIGN KEY (`barrio_id`) REFERENCES `barrios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLA: vendedores_ambulantes
-- ============================================

CREATE TABLE IF NOT EXISTS `vendedores_ambulantes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `fecha_relevamiento` date NOT NULL,
  `nombre_vendedor` varchar(255) DEFAULT NULL,
  `dni_vendedor` varchar(20) DEFAULT NULL,
  `ubicacion` varchar(255) NOT NULL,
  `rubro` varchar(100) DEFAULT NULL,
  `tiene_autorizacion` tinyint(1) DEFAULT 0,
  `pago_canon` tinyint(1) DEFAULT 0,
  `numero_recibo` varchar(50) DEFAULT NULL,
  `fecha_vencimiento_canon` date DEFAULT NULL,
  `dias_vigencia` int(11) DEFAULT NULL,
  `observaciones` text DEFAULT NULL,
  `barrio_id` int(11) DEFAULT NULL,
  `fecha_creacion` timestamp NOT NULL DEFAULT current_timestamp(),
  `fecha_actualizacion` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_vendedores_nombre` (`nombre_vendedor`),
  KEY `idx_vendedores_dni` (`dni_vendedor`),
  KEY `idx_vendedores_rubro` (`rubro`),
  KEY `idx_vendedores_autorizacion` (`tiene_autorizacion`),
  KEY `idx_vendedores_fecha` (`fecha_relevamiento`),
  CONSTRAINT `fk_vendedores_barrio` FOREIGN KEY (`barrio_id`) REFERENCES `barrios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- ACTUALIZAR VISTA: historial del contribuyente
-- ============================================

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
UNION ALL
SELECT 'comercio', c.id, c.nombre_propietario, c.dni_propietario, c.fecha_relevamiento, NULL, c.rubro, CASE WHEN c.esta_habilitado THEN 'habilitado' ELSE 'no_habilitado' END, c.direccion_comercial, c.barrio_id FROM comercios c
UNION ALL
SELECT 'vendedor_ambulante', v.id, v.nombre_vendedor, v.dni_vendedor, v.fecha_relevamiento, NULL, v.rubro, CASE WHEN v.tiene_autorizacion THEN 'autorizado' ELSE 'no_autorizado' END, v.ubicacion, v.barrio_id FROM vendedores_ambulantes v
ORDER BY fecha_registro DESC;
