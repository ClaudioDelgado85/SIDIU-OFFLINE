-- ============================================
-- MIGRACIÓN: Agregar estado 'infraccionado' a intimaciones
-- Fecha: 2026-03-03
-- Descripción: Cuando se marca infraccion_realizada = true
-- Y se proporciona numero_infraccion, el estado cambia
-- a 'infraccionado'. Se excluye de alertas de vencimiento.
-- ============================================

USE gestion_municipal;

-- 1. Ampliar el ENUM de estado
ALTER TABLE intimaciones
  MODIFY COLUMN `estado` ENUM('vigente','proxima_vencer','vencida','cumplida','reiterada','infraccionado')
  DEFAULT 'vigente';

-- 2. Actualizar registros existentes que ya tienen infraccion_realizada = 1
-- y numero_infraccion con datos
UPDATE intimaciones
SET estado = 'infraccionado'
WHERE infraccion_realizada = 1
  AND numero_infraccion IS NOT NULL
  AND numero_infraccion != ''
  AND estado NOT IN ('cumplida', 'infraccionado');
