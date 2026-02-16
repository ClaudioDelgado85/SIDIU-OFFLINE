-- ============================================
-- MIGRACIÓN: Tabla barrios + barrio_id en 5 tablas
-- Fecha: 2026-02-13
-- ============================================

USE gestion_municipal;

-- 1. Crear tabla catálogo de barrios
CREATE TABLE IF NOT EXISTS barrios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE,
  activo TINYINT(1) DEFAULT 1,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Agregar barrio_id a las 5 tablas principales
ALTER TABLE expedientes ADD COLUMN barrio_id INT DEFAULT NULL;
ALTER TABLE expedientes ADD CONSTRAINT fk_expedientes_barrio FOREIGN KEY (barrio_id) REFERENCES barrios(id);

ALTER TABLE intimaciones ADD COLUMN barrio_id INT DEFAULT NULL;
ALTER TABLE intimaciones ADD CONSTRAINT fk_intimaciones_barrio FOREIGN KEY (barrio_id) REFERENCES barrios(id);

ALTER TABLE infracciones ADD COLUMN barrio_id INT DEFAULT NULL;
ALTER TABLE infracciones ADD CONSTRAINT fk_infracciones_barrio FOREIGN KEY (barrio_id) REFERENCES barrios(id);

ALTER TABLE reclamos ADD COLUMN barrio_id INT DEFAULT NULL;
ALTER TABLE reclamos ADD CONSTRAINT fk_reclamos_barrio FOREIGN KEY (barrio_id) REFERENCES barrios(id);

ALTER TABLE relevamientos ADD COLUMN barrio_id INT DEFAULT NULL;
ALTER TABLE relevamientos ADD CONSTRAINT fk_relevamientos_barrio FOREIGN KEY (barrio_id) REFERENCES barrios(id);
