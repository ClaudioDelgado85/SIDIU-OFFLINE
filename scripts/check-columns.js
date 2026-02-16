// scripts/check-columns.js
const db = require('../config/database');

async function checkColumns() {
    try {
        const [rows] = await db.pool.execute('DESCRIBE intimaciones');
        console.log('Estructura de la tabla intimaciones:');
        rows.forEach(row => {
            console.log(`- ${row.Field} (${row.Type})`);
        });
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

checkColumns();
