-- ============================================
-- MIGRACIÓN: Tabla tareas_diarias + catálogo
-- Fecha: 2026-03-01
-- ============================================

USE gestion_municipal;

-- 1. Crear tabla de tareas diarias
CREATE TABLE IF NOT EXISTS `tareas_diarias` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `fecha` DATE NOT NULL,
  `titulo` VARCHAR(255) NOT NULL,
  `descripcion` TEXT NOT NULL,
  `direccion` VARCHAR(255) DEFAULT NULL,
  `categoria_id` INT(11) NOT NULL,
  `barrio_id` INT(11) DEFAULT NULL,
  `fecha_creacion` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_fecha` (`fecha`),
  KEY `idx_categoria` (`categoria_id`),
  CONSTRAINT `fk_tareas_categoria` FOREIGN KEY (`categoria_id`) REFERENCES `catalogos` (`id`),
  CONSTRAINT `fk_tareas_barrio` FOREIGN KEY (`barrio_id`) REFERENCES `barrios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Datos iniciales: categorías de tareas diarias
INSERT INTO catalogos (categoria, valor, label, orden) VALUES
  ('tipo_tarea_diaria', 'operativo', 'Operativo', 1),
  ('tipo_tarea_diaria', 'regulacion_transito', 'Regulación de Tránsito', 2),
  ('tipo_tarea_diaria', 'verificacion', 'Verificación', 3),
  ('tipo_tarea_diaria', 'asistencia', 'Asistencia', 4),
  ('tipo_tarea_diaria', 'varios', 'Varios', 99);
