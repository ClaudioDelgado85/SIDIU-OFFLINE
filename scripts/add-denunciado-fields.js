// scripts/add-denunciado-fields.js
const db = require('../config/database');

async function addDenunciadoFields() {
    try {
        console.log('🔄 Agregando campos de denunciado a tabla reclamos...\n');

        // Agregar columnas una por una para evitar errores si ya existen
        const alterations = [
            { field: 'denunciado_nombre', sql: 'ALTER TABLE reclamos ADD COLUMN denunciado_nombre VARCHAR(255) NULL AFTER direccion_incidente' },
            { field: 'denunciado_dni', sql: 'ALTER TABLE reclamos ADD COLUMN denunciado_dni VARCHAR(20) NULL AFTER denunciado_nombre' },
            { field: 'denunciado_direccion', sql: 'ALTER TABLE reclamos ADD COLUMN denunciado_direccion TEXT NULL AFTER denunciado_dni' }
        ];

        for (const alt of alterations) {
            try {
                await db.pool.execute(alt.sql);
                console.log(`  ✅ Campo '${alt.field}' agregado`);
            } catch (err) {
                if (err.code === 'ER_DUP_FIELDNAME') {
                    console.log(`  ⚠️  Campo '${alt.field}' ya existe, omitiendo`);
                } else {
                    throw err;
                }
            }
        }

        console.log('\n✅ Migración completada exitosamente');

        // Mostrar estructura actualizada
        console.log('\n📋 Estructura actualizada de tabla reclamos:\n');
        const [cols] = await db.pool.execute('DESCRIBE reclamos');
        cols.forEach(c => console.log(`  ${c.Field.padEnd(25)} ${c.Type.padEnd(30)} ${c.Null === 'YES' ? 'NULL' : 'NOT NULL'}`));

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

addDenunciadoFields();
