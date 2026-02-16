// scripts/reset-intimaciones.js
const db = require('../config/database');
const fs = require('fs');
const path = require('path');

async function resetIntimaciones() {
    try {
        console.log('1. Eliminando tabla intimaciones...');
        await db.pool.execute('DROP TABLE IF EXISTS intimaciones');

        console.log('2. Leyendo schema.sql...');
        const schemaPath = path.join(__dirname, '../database/schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        // Extraer la parte de create table intimaciones
        // O mejor: correr todo el script. 
        // Si corro todo, el 'IF NOT EXISTS' evitará problemas con las otras tablas.

        console.log('3. Ejecutando schema.sql...');
        // Separamos por ; para ejecutar sentencias individuales
        const statements = schema.split(';').map(s => s.trim()).filter(s => s.length > 0);

        for (const sql of statements) {
            // Ignorar USE y comentarios puros si mysql2 no los soporta bien en execute individual
            if (sql.toUpperCase().startsWith('USE')) continue;

            try {
                await db.pool.execute(sql);
            } catch (err) {
                // Ignorar error de tabla ya existente si es IF NOT EXISTS
                // Pero como es IF NOT EXISTS no debería dar error.
                // Insertar usuarios puede dar error Duplicate entry, ignorar.
                if (err.code === 'ER_DUP_ENTRY') continue;
                console.warn('Advertencia ejecutando SQL:', err.message.substring(0, 100));
            }
        }

        console.log('✅ Tabla intimaciones recreada exitosamente.');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

resetIntimaciones();
