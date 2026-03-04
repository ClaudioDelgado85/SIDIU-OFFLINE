-- ============================================
-- MIGRACIÓN: Agregar estado 'reiterada' a intimaciones
-- Fecha: 2026-03-02
-- Descripción: Cuando se crea una nueva intimación para el
-- mismo contribuyente (DNI + dirección), las anteriores
-- pasan a estado 'reiterada'. Solo la última se considera
-- activa para alertas y vencimientos.
-- ============================================

USE gestion_municipal;

-- 1. Ampliar el ENUM de estado
ALTER TABLE intimaciones
  MODIFY COLUMN `estado` ENUM('vigente','proxima_vencer','vencida','cumplida','reiterada')
  DEFAULT 'vigente';

-- 2. Actualizar registros existentes: para cada grupo DNI+dirección,
--    marcar como 'reiterada' todas excepto la más reciente
UPDATE intimaciones i
INNER JOIN (
    SELECT dni, direccion, MAX(id) AS ultimo_id
    FROM intimaciones
    WHERE dio_cumplimiento = 0
    GROUP BY dni, direccion
    HAVING COUNT(*) > 1
) AS ultimas ON i.dni = ultimas.dni AND i.direccion = ultimas.direccion
SET i.estado = 'reiterada'
WHERE i.id != ultimas.ultimo_id
  AND i.dio_cumplimiento = 0
  AND i.estado != 'cumplida';
