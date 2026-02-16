// scripts/export-schema.js
const db = require('../config/database');
const fs = require('fs');
const path = require('path');

async function exportSchema() {
    console.log('📋 Exportando esquema de base de datos actualizado...\n');

    try {
        // Obtener todas las tablas (excluir vistas)
        const [tables] = await db.pool.execute(`
            SELECT TABLE_NAME FROM information_schema.TABLES 
            WHERE TABLE_SCHEMA = 'gestion_municipal' AND TABLE_TYPE = 'BASE TABLE'
            ORDER BY TABLE_NAME
        `);

        let schemaSQL = `-- ============================================
-- SCHEMA ACTUALIZADO: Base de Datos gestion_municipal
-- Generado automáticamente: ${new Date().toISOString().split('T')[0]}
-- ============================================

CREATE DATABASE IF NOT EXISTS gestion_municipal;
USE gestion_municipal;

`;

        for (const table of tables) {
            const tableName = table.TABLE_NAME;
            console.log(`  Exportando: ${tableName}`);

            // Obtener CREATE TABLE statement
            const [createResult] = await db.pool.execute(`SHOW CREATE TABLE ${tableName}`);
            let createStatement = createResult[0]['Create Table'];

            // Limpiar y formatear
            createStatement = createStatement
                .replace(/AUTO_INCREMENT=\d+\s*/g, '') // Quitar AUTO_INCREMENT value
                .replace(/\s+/g, ' ')
                .replace(/\( /g, '(\n  ')
                .replace(/, /g, ',\n  ')
                .replace(/ \)/g, '\n)')
                .replace(/ENGINE=InnoDB/, '\n) ENGINE=InnoDB');

            schemaSQL += `-- Tabla: ${tableName}\n`;
            schemaSQL += `DROP TABLE IF EXISTS ${tableName};\n`;
            schemaSQL += createStatement + ';\n\n';
        }

        // Exportar vistas también
        const [views] = await db.pool.execute(`
            SELECT TABLE_NAME FROM information_schema.TABLES 
            WHERE TABLE_SCHEMA = 'gestion_municipal' AND TABLE_TYPE = 'VIEW'
            ORDER BY TABLE_NAME
        `);

        if (views.length > 0) {
            schemaSQL += `-- ============================================\n`;
            schemaSQL += `-- VISTAS\n`;
            schemaSQL += `-- ============================================\n\n`;

            for (const view of views) {
                const viewName = view.TABLE_NAME;
                console.log(`  Exportando vista: ${viewName}`);

                const [createView] = await db.pool.execute(`SHOW CREATE VIEW ${viewName}`);
                let viewStatement = createView[0]['Create View'];

                schemaSQL += `-- Vista: ${viewName}\n`;
                schemaSQL += `DROP VIEW IF EXISTS ${viewName};\n`;
                schemaSQL += viewStatement + ';\n\n';
            }
        }

        // Guardar archivo
        const outputPath = path.join(__dirname, '..', 'database', 'schema.sql');
        fs.writeFileSync(outputPath, schemaSQL);

        console.log(`\n✅ Schema exportado a: database/schema.sql`);
        console.log(`   Tablas: ${tables.length}`);
        console.log(`   Vistas: ${views.length}`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

exportSchema();
