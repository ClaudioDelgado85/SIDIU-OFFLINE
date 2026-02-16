-- ============================================
-- MIGRACIÓN: Agregar dirección y número de partida a expedientes
-- Fecha: 2026-02-16
-- Ambos campos son opcionales (DEFAULT NULL)
-- ============================================

USE gestion_municipal;

ALTER TABLE expedientes
  ADD COLUMN `direccion` VARCHAR(255) DEFAULT NULL AFTER `motivo`,
  ADD COLUMN `numero_partida` VARCHAR(50) DEFAULT NULL AFTER `direccion`;
