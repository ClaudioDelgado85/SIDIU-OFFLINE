const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function exportarSchema() {
    console.log('Iniciando exportación del esquema unificado...');
    
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'gestion_municipal',
            port: process.env.DB_PORT || 3306
        });

        const [tables] = await connection.query("SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'");
        const [views] = await connection.query("SHOW FULL TABLES WHERE Table_type = 'VIEW'");
        
        let schemaSql = `-- ==========================================================\n`;
        schemaSql += `-- SISTEMA DE GESTIÓN MUNICIPAL - CLORINDA\n`;
        schemaSql += `-- ESQUEMA UNIFICADO (Generado Automáticamente)\n`;
        schemaSql += `-- Fecha: ${new Date().toLocaleString()}\n`;
        schemaSql += `-- ==========================================================\n\n`;
        
        schemaSql += `SET FOREIGN_KEY_CHECKS = 0;\n\n`;

        // Procesar tablas
        for (const row of tables) {
            const tableName = Object.values(row)[0];
            const [createTable] = await connection.query(`SHOW CREATE TABLE \`${tableName}\``);
            schemaSql += `-- Estructura para la tabla: ${tableName}\n`;
            schemaSql += `DROP TABLE IF EXISTS \`${tableName}\`;\n`;
            schemaSql += createTable[0]['Create Table'] + ';\n\n';
        }

        // Procesar vistas
        for (const row of views) {
            const viewName = Object.values(row)[0];
            const [createView] = await connection.query(`SHOW CREATE VIEW \`${viewName}\``);
            schemaSql += `-- Estructura para la vista: ${viewName}\n`;
            schemaSql += `DROP VIEW IF EXISTS \`${viewName}\`;\n`;
            // Las vistas traen un statement complejo con definer, limpiamos un poco
            let statement = createView[0]['Create View'];
            statement = statement.replace(/CREATE ALGORITHM=UNDEFINED DEFINER=`[^`]+`@`[^`]+` SQL SECURITY DEFINER VIEW/, 'CREATE VIEW');
            schemaSql += statement + ';\n\n';
        }

        schemaSql += `SET FOREIGN_KEY_CHECKS = 1;\n`;

        const outputPath = path.join(__dirname, '../database/schema_unificado.sql');
        fs.writeFileSync(outputPath, schemaSql);
        
        console.log('✅ Esquema unificado exportado con éxito en: database/schema_unificado.sql');

    } catch (error) {
        console.error('❌ Error al exportar:', error);
    } finally {
        if (connection) await connection.end();
    }
}

exportarSchema();
