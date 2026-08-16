-- Migración: Soporte de Casos y Grupos Explícitos en Intimaciones
-- Fecha: 2026-08-16
--
-- Nota: este archivo NO debe ejecutarse crudo sobre una base ya migrada.
-- El script scripts/migrar_grupos_intimaciones.js aplica el ALTER solo si la
-- columna no existe (guard PRAGMA table_info) y luego crea el índice.

ALTER TABLE intimaciones ADD COLUMN grupo_id TEXT;

CREATE INDEX IF NOT EXISTS idx_intimaciones_grupo_id
ON intimaciones(grupo_id);