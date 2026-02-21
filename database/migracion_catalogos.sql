-- ============================================
-- MIGRACIÓN: Tabla genérica de catálogos
-- Fecha: 2026-02-21
-- ============================================

USE gestion_municipal;

-- 1. Crear tabla de catálogos
CREATE TABLE IF NOT EXISTS `catalogos` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `categoria` VARCHAR(50) NOT NULL COMMENT 'Identificador de la categoría (ej: tipo_intimacion, intimacion_por)',
  `valor` VARCHAR(100) NOT NULL COMMENT 'Valor interno que se guarda en los registros',
  `label` VARCHAR(150) NOT NULL COMMENT 'Texto visible al usuario',
  `orden` INT(11) DEFAULT 0 COMMENT 'Orden de aparición en los selects',
  `activo` TINYINT(1) DEFAULT 1 COMMENT 'Soft delete: 0 = desactivado',
  `fecha_creacion` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_categoria_valor` (`categoria`, `valor`),
  KEY `idx_categoria_activo` (`categoria`, `activo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Datos iniciales: tipo_intimacion
INSERT INTO catalogos (categoria, valor, label, orden) VALUES
  ('tipo_intimacion', 'general', 'General', 1),
  ('tipo_intimacion', 'baldio', 'Terreno Baldío', 2),
  ('tipo_intimacion', 'vehiculo', 'Vehículo Abandonado', 3);

-- 3. Datos iniciales: intimacion_por
INSERT INTO catalogos (categoria, valor, label, orden) VALUES
  ('intimacion_por', 'escombros', 'Escombros', 1),
  ('intimacion_por', 'arena', 'Arena', 2),
  ('intimacion_por', 'construccion', 'Construcción sin autorización', 3),
  ('intimacion_por', 'agua_servida', 'Pérdida de agua servida', 4),
  ('intimacion_por', 'basura', 'Basura / Residuos', 5),
  ('intimacion_por', 'otros', 'Otros', 99);

-- 4. Datos iniciales: motivo_expediente
INSERT INTO catalogos (categoria, valor, label, orden) VALUES
  ('motivo_expediente', 'habilitacion', 'Habilitación', 1),
  ('motivo_expediente', 'reempadronamiento', 'Reempadronamiento', 2),
  ('motivo_expediente', 'ampliacion_rubro', 'Ampliación de rubro', 3),
  ('motivo_expediente', 'cambio_rubro', 'Cambio de rubro', 4),
  ('motivo_expediente', 'traslado_local', 'Traslado de local', 5),
  ('motivo_expediente', 'cambio_titular', 'Cambio de titular', 6),
  ('motivo_expediente', 'cancelacion', 'Cancelación', 7),
  ('motivo_expediente', 'reclamos', 'Reclamos', 8),
  ('motivo_expediente', 'aprobacion_plano', 'Aprobación de plano', 9),
  ('motivo_expediente', 'oficio_juzgado', 'Oficio del juzgado', 10),
  ('motivo_expediente', 'otros', 'Otros', 99);

-- 5. Cambiar ENUM a VARCHAR en intimaciones.tipo
--    Esto permite agregar nuevos tipos sin modificar la estructura de la tabla
ALTER TABLE intimaciones MODIFY COLUMN `tipo` VARCHAR(50) NOT NULL DEFAULT 'general';
