const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

// Sobrescribimos el entorno para asegurarnos que atacamos staging/prod actual
// Asegurándonos que apunte a TiDB como está en tu .env local
async function seedRemote() {
    let connection;
    try {
        console.log('⏳ Conectando a TiDB (MySQL remoto)...');
        
        const dbConfig = {
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT || 4000,
            multipleStatements: true 
        };

        if (process.env.DB_SSL === 'true') {
            dbConfig.ssl = { rejectUnauthorized: false };
        }

        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Conexión establecida.');

        // Lista de archivos SQL con DATOS a inyectar
        const dataFiles = [
            'migracion_catalogos.sql',
            'migracion_barrios.sql'
        ];

        for (const file of dataFiles) {
            const schemaPath = path.join(__dirname, '../database', file);
            if (fs.existsSync(schemaPath)) {
                console.log(`📄 Leyendo e inyectando datos de: ${file}...`);
                
                // Leemos el archivo y quitamos la sentencia USE gestion_municipal; porque puede fallar si la DB se llama 'test'
                let sqlScript = fs.readFileSync(schemaPath, 'utf8');
                sqlScript = sqlScript.replace(/USE\s+[^;]+;/gi, ''); 

                await connection.query(sqlScript);
                console.log(`   ✔️ Ejecutado con éxito.`);
            } else {
                console.log(`⚠️ Archivo no encontrado: ${file}`);
            }
        }

        console.log('🎉 ¡Datos predeterminados inyectados con éxito en la Nube!');
        
    } catch (error) {
        console.error('❌ Error fatal:', error);
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔌 Conexión cerrada.');
        }
        process.exit(0);
    }
}

seedRemote();
