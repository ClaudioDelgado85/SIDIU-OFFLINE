// scripts/check-infracciones-columns.js
const db = require('../config/database');

async function checkColumns() {
    try {
        const [rows] = await db.pool.execute('DESCRIBE infracciones');
        console.log('Estructura de la tabla infracciones:');
        rows.forEach(row => {
            console.log(`- ${row.Field} (${row.Type})`);
        });
        process.exit(0);
    } catch (error) {
        if (error.code === 'ER_NO_SUCH_TABLE') {
            console.log('❌ La tabla "infracciones" NO existe en la base de datos actual.');
        } else {
            console.error('Error:', error.message);
        }
        process.exit(1);
    }
}

checkColumns();
