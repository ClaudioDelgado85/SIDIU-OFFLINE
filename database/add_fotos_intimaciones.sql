-- Agrega las columnas foto_inicial y foto_actual a la tabla intimaciones
ALTER TABLE intimaciones ADD COLUMN foto_inicial TEXT DEFAULT NULL;
ALTER TABLE intimaciones ADD COLUMN foto_actual TEXT DEFAULT NULL;
