const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function initDB() {
    let connection;
    try {
        console.log('Conectando a MySQL...');
        // Conectar sin seleccionar base de datos para poder crearla si no existe
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            multipleStatements: true
        });

        console.log('Leyendo schema...');
        const schemaPath = path.join(__dirname, '../database/schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        console.log('Ejecutando script SQL...');
        await connection.query(schema);

        console.log('✓ Base de datos inicializada correctamente');
        console.log('✓ Tablas creadas: usuarios, expedientes');
        console.log('✓ Usuario admin verificado/creado');

    } catch (error) {
        console.error('✗ Error al inicializar base de datos:', error.message);
        console.error(error);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

initDB();
