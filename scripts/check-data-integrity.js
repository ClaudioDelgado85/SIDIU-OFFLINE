// scripts/check-data-integrity.js
const db = require('../config/database');

async function checkIntegrity() {
    console.log('🏥 INICIANDO HEALTH CHECK DE BASE DE DATOS...\n');

    try {
        await checkTable('expedientes', 'numero_expediente', ['fecha', 'nombre_apellido', 'dni', 'estado']);
        await checkTable('intimaciones', 'id', ['fecha', 'tipo', 'nombre_apellido', 'dni']);
        await checkTable('infracciones', 'numero_acta', ['fecha', 'nombre_apellido', 'dni']);
        await checkTable('reclamos', 'numero_reclamo', ['fecha_creacion', 'tipo_reclamo', 'direccion_incidente']);
        await checkTable('relevamientos', 'numero_relevamiento', ['fecha_relevamiento', 'tipo_relevamiento', 'ubicacion']);

        console.log('\n✅ HEALTH CHECK COMPLETADO.');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error fatal:', error);
        process.exit(1);
    }
}

async function checkTable(tableName, idField, requiredFields) {
    console.log(`Checking table: ${tableName.toUpperCase()}...`);

    // 1. Total Records
    const [count] = await db.pool.execute(`SELECT COUNT(*) as total FROM ${tableName}`);
    console.log(`  - Total registros: ${count[0].total}`);

    if (count[0].total === 0) {
        console.log('  - ⚠️ Tabla vacía.');
        return;
    }

    // 2. Check Required Fields (NULLs)
    for (const field of requiredFields) {
        const [nulls] = await db.pool.execute(
            `SELECT COUNT(*) as bad FROM ${tableName} WHERE ${field} IS NULL OR ${field} = ''`
        );
        if (nulls[0].bad > 0) {
            console.error(`  - ❌ ${nulls[0].bad} registros tienen '${field}' VACÍO o NULL.`);
        } else {
            console.log(`  - ✓ Campo '${field}' OK.`);
        }
    }

    // 3. Check DNI format (if exists in required fields)
    if (requiredFields.includes('dni')) {
        const [badDni] = await db.pool.execute(
            `SELECT COUNT(*) as bad FROM ${tableName} WHERE dni NOT REGEXP '^[0-9]+$' OR LENGTH(dni) < 6`
        );
        if (badDni[0].bad > 0) {
            console.error(`  - ⚠️ ${badDni[0].bad} registros tienen DNI con formato sospechoso (no numérico o muy corto).`);
        } else {
            console.log(`  - ✓ Formato DNI OK.`);
        }
    }

    console.log('');
}

checkIntegrity();
