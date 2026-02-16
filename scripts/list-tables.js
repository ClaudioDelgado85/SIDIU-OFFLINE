// scripts/list-tables.js
const db = require('../config/database');

async function listTables() {
    try {
        const [rows] = await db.pool.execute('SHOW TABLES');
        console.log('📋 Tablas en la base de datos gestion_municipal:\n');
        rows.forEach((row, i) => {
            const tableName = Object.values(row)[0];
            console.log(`  ${i + 1}. ${tableName}`);
        });
        console.log(`\nTotal: ${rows.length} tablas`);
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

listTables();
