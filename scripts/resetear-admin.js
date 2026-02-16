// scripts/resetear-admin.js
// Script para resetear la contraseña del administrador

const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function resetearAdmin() {
    let connection;
    
    try {
        console.log('Conectando a la base de datos...');
        
        // Crear conexión
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'gestion_municipal'
        });
        
        console.log('✓ Conectado a MySQL');
        
        // Generar hash de la contraseña "admin123"
        const password = 'admin123';
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);
        
        console.log('\nGenerando nueva contraseña...');
        console.log('Contraseña: admin123');
        console.log('Hash generado:', passwordHash);
        
        // Verificar si el usuario admin existe
        const [usuarios] = await connection.execute(
            'SELECT id FROM usuarios WHERE usuario = ?',
            ['admin']
        );
        
        if (usuarios.length > 0) {
            // Actualizar contraseña
            await connection.execute(
                'UPDATE usuarios SET password_hash = ? WHERE usuario = ?',
                [passwordHash, 'admin']
            );
            console.log('\n✓ Contraseña del admin actualizada exitosamente');
        } else {
            // Crear usuario admin
            await connection.execute(
                `INSERT INTO usuarios (nombre_completo, usuario, email, password_hash, rol) 
                 VALUES (?, ?, ?, ?, ?)`,
                ['Administrador del Sistema', 'admin', 'admin@clorinda.gob.ar', passwordHash, 'admin_total']
            );
            console.log('\n✓ Usuario admin creado exitosamente');
        }
        
        console.log('\n===========================================');
        console.log('Usuario: admin');
        console.log('Contraseña: admin123');
        console.log('===========================================');
        console.log('\n¡Ahora puedes hacer login!');
        
    } catch (error) {
        console.error('\n✗ Error:', error.message);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Ejecutar
resetearAdmin();
