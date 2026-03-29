const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function importSchema() {
    let connection;
    try {
        console.log('⏳ Conectando a TiDB (MySQL remoto)...');
        
        // Crear configuración con soporte para multi-statement y SSL
        const dbConfig = {
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT || 4000,
            multipleStatements: true // Crítico para ejecutar el dump entero
        };

        if (process.env.DB_SSL === 'true') {
            dbConfig.ssl = { rejectUnauthorized: false };
        }

        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Conexión establecida.');

        // Leer archivo
        const schemaPath = path.join(__dirname, '../database/schema_unificado.sql');
        console.log(`📄 Leyendo archivo: ${schemaPath}`);
        const schema = fs.readFileSync(schemaPath, 'utf8');

        console.log('⚙️ Ejecutando 21KB de instrucciones SQL... (esto puede tardar unos segundos)');
        await connection.query(schema);

        console.log('🎉 ¡Estructura de Base de Datos importada con éxito!');
        
    } catch (error) {
        console.error('❌ Error fatal al importar esquema:', error);
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔌 Conexión cerrada.');
        }
        process.exit(0);
    }
}

importSchema();
