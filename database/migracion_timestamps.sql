-- ============================================
-- MIGRACIÓN: Estandarizar timestamps
-- Fecha: 2026-02-13
-- 
-- 1. Renombrar intimaciones.created_at → fecha_creacion
-- 2. Renombrar intimaciones.updated_at → fecha_actualizacion
-- 3. Agregar reclamos.fecha_actualizacion
-- 4. Agregar barrios.fecha_actualizacion
-- 5. UNIQUE en usuarios.email
-- ============================================

USE gestion_municipal;

-- 1. Renombrar timestamps en intimaciones
ALTER TABLE intimaciones 
  CHANGE COLUMN `created_at` `fecha_creacion` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHANGE COLUMN `updated_at` `fecha_actualizacion` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- 2. Agregar fecha_actualizacion a reclamos
ALTER TABLE reclamos 
  ADD COLUMN `fecha_actualizacion` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- 3. Agregar fecha_actualizacion a barrios
ALTER TABLE barrios 
  ADD COLUMN `fecha_actualizacion` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- 4. UNIQUE en email de usuarios
ALTER TABLE usuarios 
  ADD UNIQUE KEY `idx_email_unico` (`email`);
