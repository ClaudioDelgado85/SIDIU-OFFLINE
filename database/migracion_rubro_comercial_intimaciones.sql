-- Migración: Agregar columna rubro_comercial a intimaciones
-- Fecha: 2025-06-13

ALTER TABLE intimaciones ADD COLUMN rubro_comercial TEXT;

-- Opcional: índice para filtros futuros
CREATE INDEX IF NOT EXISTS idx_intimaciones_rubro_comercial
ON intimaciones(rubro_comercial);
