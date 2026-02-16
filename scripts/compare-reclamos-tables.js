// scripts/compare-reclamos-tables.js
const db = require('../config/database');

async function compareTables() {
    try {
        console.log('=== Estructura de tabla RECLAMOS (nueva) ===\n');
        const [cols1] = await db.pool.execute('DESCRIBE reclamos');
        cols1.forEach(c => console.log(`  ${c.Field.padEnd(25)} ${c.Type.padEnd(30)} ${c.Null === 'YES' ? 'NULL' : 'NOT NULL'}`));

        console.log('\n=== Estructura de tabla RECLAMOS_VECINALES (existente) ===\n');
        const [cols2] = await db.pool.execute('DESCRIBE reclamos_vecinales');
        cols2.forEach(c => console.log(`  ${c.Field.padEnd(25)} ${c.Type.padEnd(30)} ${c.Null === 'YES' ? 'NULL' : 'NOT NULL'}`));

        console.log('\n=== Datos en cada tabla ===\n');
        const [count1] = await db.pool.execute('SELECT COUNT(*) as total FROM reclamos');
        const [count2] = await db.pool.execute('SELECT COUNT(*) as total FROM reclamos_vecinales');
        console.log(`  reclamos:          ${count1[0].total} registros`);
        console.log(`  reclamos_vecinales: ${count2[0].total} registros`);

        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

compareTables();
