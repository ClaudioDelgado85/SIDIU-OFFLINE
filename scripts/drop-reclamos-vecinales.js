// scripts/drop-reclamos-vecinales.js
const db = require('../config/database');

async function dropTable() {
    try {
        console.log('🗑️  Eliminando tabla obsoleta reclamos_vecinales...');
        await db.pool.execute('DROP TABLE IF EXISTS reclamos_vecinales');
        console.log('✅ Tabla reclamos_vecinales eliminada correctamente');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

dropTable();
