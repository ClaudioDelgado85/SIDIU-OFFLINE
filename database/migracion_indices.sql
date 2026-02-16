-- ============================================
-- MIGRACIÓN: Agregar índices faltantes
-- Fecha: 2026-02-13
-- Tablas afectadas: intimaciones, reclamos
-- ============================================

USE gestion_municipal;

-- ============================================
-- INTIMACIONES: No tenía ningún índice (solo PK)
-- ============================================

ALTER TABLE intimaciones
  ADD INDEX idx_estado (estado),
  ADD INDEX idx_tipo (tipo),
  ADD INDEX idx_fecha (fecha),
  ADD INDEX idx_dni (dni),
  ADD INDEX idx_nombre (nombre_apellido);

-- ============================================
-- RECLAMOS: Faltaban índices en columnas de filtro
-- ============================================

ALTER TABLE reclamos
  ADD INDEX idx_estado (estado),
  ADD INDEX idx_tipo_reclamo (tipo_reclamo),
  ADD INDEX idx_fecha_creacion (fecha_creacion);
