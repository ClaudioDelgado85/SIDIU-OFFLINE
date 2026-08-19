-- Migración: Historial de plazos otorgados a intimaciones (referencia MySQL)
-- Fecha: 2026-08-17
--
-- Nota: este archivo es SOLO REFERENCIA para el motor MySQL (producción).
-- NO debe ejecutarse crudo contra una base ya migrada: el script
-- scripts/migrar_plazos_intimaciones.js aplica el CREATE TABLE IF NOT EXISTS
-- idempotente sobre SQLite y el mismo DDL aquí es la contraparte MySQL.
--
-- Para SQLite (offline/tests) el esquema vive en database/schema_sqlite.sql.

CREATE TABLE IF NOT EXISTS plazos_intimacion (
  id INT AUTO_INCREMENT PRIMARY KEY,
  intimacion_id INT NOT NULL,
  fecha_otorgamiento DATE NOT NULL,
  dias INT NOT NULL CHECK (dias > 0),
  motivo TEXT,
  usuario VARCHAR(255),
  fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_plazos_intimacion_intimacion
    FOREIGN KEY (intimacion_id) REFERENCES intimaciones(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- MySQL 8 no admite CREATE INDEX IF NOT EXISTS (sintaxis MariaDB/SQLite).
-- Antes de ejecutar este DDL, verificar que el índice no exista:
--   SELECT COUNT(*) FROM information_schema.statistics
--   WHERE table_schema = DATABASE() AND table_name = 'plazos_intimacion'
--     AND index_name = 'idx_plazos_intimacion_intimacion_id';
CREATE INDEX idx_plazos_intimacion_intimacion_id
ON plazos_intimacion(intimacion_id);