// scripts/create-reclamos-table.js
const db = require('../config/database');

async function createReclamosTable() {
    try {
        const sql = `
            CREATE TABLE IF NOT EXISTS reclamos (
                id INT AUTO_INCREMENT PRIMARY KEY,
                numero_reclamo VARCHAR(20) NOT NULL UNIQUE,
                fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                
                tipo_reclamo ENUM('alumbrado', 'baldio', 'ruidos', 'animales', 'cloacas', 'obras', 'varios') NOT NULL,
                descripcion TEXT NOT NULL,
                direccion_incidente VARCHAR(255) NOT NULL,
                foto_url VARCHAR(255),
                
                vecino_nombre VARCHAR(100),
                vecino_telefono VARCHAR(50),
                
                estado ENUM('pendiente', 'en_proceso', 'resuelto', 'anulado') DEFAULT 'pendiente',
                prioridad ENUM('baja', 'media', 'alta', 'urgente') DEFAULT 'media',
                fecha_resolucion DATE,
                observaciones_resolucion TEXT,
                
                usuario_creador_id INT,
                FOREIGN KEY (usuario_creador_id) REFERENCES usuarios(id)
            );
        `;

        await db.pool.execute(sql);
        console.log('✅ Tabla "reclamos" creada o verificada correctamente.');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error creando tabla reclamos:', error);
        process.exit(1);
    }
}

createReclamosTable();
