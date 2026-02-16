-- ============================================
-- MIGRACIÓN: Refactorizar estados de expedientes
-- Fecha: 2026-02-16
--
-- Flujo nuevo: ingreso → en_inspeccion → plazo_otorgado → salida
-- Mapeo: en_oficina→en_inspeccion, cumplimiento→plazo_otorgado
-- ============================================

USE gestion_municipal;

-- 1. Agregar nuevos campos
ALTER TABLE expedientes
  ADD COLUMN `fecha_inspeccion` DATE DEFAULT NULL AFTER `estado`,
  ADD COLUMN `plazo_dias` INT DEFAULT NULL AFTER `fecha_inspeccion`,
  ADD COLUMN `fecha_salida` DATE DEFAULT NULL AFTER `plazo_dias`,
  ADD COLUMN `observaciones` TEXT DEFAULT NULL AFTER `fecha_salida`;

-- 2. Migrar datos existentes antes de cambiar el ENUM
UPDATE expedientes SET estado = 'ingreso' WHERE estado = 'en_oficina';
UPDATE expedientes SET estado = 'ingreso' WHERE estado = 'cumplimiento';

-- 3. Cambiar el ENUM a los nuevos estados
ALTER TABLE expedientes 
  MODIFY COLUMN `estado` ENUM('ingreso','en_inspeccion','plazo_otorgado','salida') NOT NULL DEFAULT 'ingreso';
