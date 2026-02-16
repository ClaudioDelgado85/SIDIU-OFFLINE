// scripts/recreate-relevamientos.js
const db = require('../config/database');

async function recreateTable() {
    console.log('🔄 Recreando tabla relevamientos (Estructura General)...');

    try {
        // 1. Eliminar tabla existente
        await db.pool.execute('DROP TABLE IF EXISTS relevamientos');
        console.log('✅ Tabla anterior eliminada.');

        // 2. Crear nueva tabla
        // Unificamos nombre_ocupante/dni en responsable_nombre/responsable_dni
        // Agregamos tipo, zona, estado, foto
        const createSQL = `
            CREATE TABLE relevamientos (
                id INT AUTO_INCREMENT PRIMARY KEY,
                numero_relevamiento VARCHAR(20) NOT NULL UNIQUE, -- Ej: B-2026-001
                fecha_relevamiento DATE NOT NULL,
                tipo_relevamiento ENUM('baldio', 'obra', 'ocupacion', 'comercio', 'varios') NOT NULL,
                ubicacion VARCHAR(255) NOT NULL,
                zona VARCHAR(100) DEFAULT NULL, -- Barrio o Zona
                
                -- Datos del Responsable (Ocupante / Propietario / Encargado)
                responsable_nombre VARCHAR(255) DEFAULT NULL,
                responsable_dni VARCHAR(20) DEFAULT NULL,
                
                observaciones TEXT,
                foto_url VARCHAR(255) DEFAULT NULL,
                
                -- Campos específicos para Espacio Público (Opcionales)
                tiene_autorizacion TINYINT(1) DEFAULT 0,
                paga_canon TINYINT(1) DEFAULT 0,
                fecha_vencimiento_canon DATE DEFAULT NULL,

                fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

                INDEX idx_tipo (tipo_relevamiento),
                INDEX idx_responsable (responsable_nombre)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `;

        await db.pool.execute(createSQL);
        console.log('✅ Nueva tabla relevamientos creada correctamente.');

        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

recreateTable();
