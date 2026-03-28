const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function resetearBD() {
    console.log('Iniciando reseteo rápido de la Base de Datos para QA...');
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'gestion_municipal',
            port: process.env.DB_PORT || 3306,
            multipleStatements: true // Importante para ejecutar un schema.sql completo
        });

        const sqlPath = path.join(__dirname, '../database/schema_unificado.sql');
        
        if (!fs.existsSync(sqlPath)) {
            console.error('❌ No se encontró schema_unificado.sql. Ejecutá primero node scripts/exportar_schema.js');
            return;
        }

        console.log('⏳ Ejecutando schema_unificado.sql (esto borrará TODA la data)...');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        await connection.query(sql);
        console.log('✅ Base de datos recreada desde cero exitosamente.');

        console.log('⏳ Inyectando los 3 usuarios de prueba QA...');
        
        // Hashear contraseña (será "qa123" para los 3)
        const salt = await bcrypt.genSalt(10);
        const hashQA = await bcrypt.hash('qa123', salt);

        // Limpiar tabla usuarios por las dudas (el schema ya lo hace, pero aseguramos si había residuos)
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');
        await connection.query('DELETE FROM usuarios');
        await connection.query('ALTER TABLE usuarios AUTO_INCREMENT = 1');
        await connection.query('SET FOREIGN_KEY_CHECKS = 1');

        // Insertar los 3 roles
        const usersToInsert = [
            ['Admin QA', 'admin_qa', 'admin@qa.local', hashQA, 'admin_total', 1],
            ['Carga QA', 'carga_qa', 'carga@qa.local', hashQA, 'carga', 1],
            ['Visor QA', 'visor_qa', 'visor@qa.local', hashQA, 'consulta', 1]
        ];

        // Módulos para los permisos del rol Carga (solo Expedientes e Intimaciones)
        const modulosCarga = ['expedientes', 'intimaciones'];

        for (const u of usersToInsert) {
            const [result] = await connection.query(
                `INSERT INTO usuarios (nombre_completo, usuario, email, password_hash, rol, activo) VALUES (?, ?, ?, ?, ?, ?)`,
                u
            );
            
            // Si es carga, le asestamos sus permisos
            if (u[4] === 'carga') {
                for (const mod of modulosCarga) {
                    await connection.query(
                        `INSERT INTO permisos_modulos (usuario_id, modulo, habilitado) VALUES (?, ?, 1)`,
                        [result.insertId, mod]
                    );
                }
            }
        }

        console.log('✅ Usuarios Inyectados:');
        console.log('   - Usuario: admin_qa  | Clave: qa123 | Rol: Administrador');
        console.log('   - Usuario: carga_qa  | Clave: qa123 | Rol: De Carga (Acceso limitados)');
        console.log('   - Usuario: visor_qa  | Clave: qa123 | Rol: Sólo Lectura');
        
        console.log('\n🚀 ¡Todo listo! La BD está limpia y lista para probar el sistema seguro.');

    } catch (error) {
        console.error('❌ Error al resetear la BD:', error);
    } finally {
        if (connection) await connection.end();
    }
}

resetearBD();
