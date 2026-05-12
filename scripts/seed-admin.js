// scripts/seed-admin.js
const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');

const createAdmin = async () => {
  try {
    const adminUser = process.env.ADMIN_USER || 'admin';
    const adminPass = process.env.ADMIN_PASSWORD;
    if (!adminPass) {
      console.error('ERROR: Debe definir ADMIN_PASSWORD en las variables de entorno.');
      process.exit(1);
    }
    
    // Verificar si el administrador ya existe
    const [existingUsers] = await pool.query('SELECT id FROM usuarios WHERE usuario = ?', [adminUser]);
    
    if (existingUsers.length > 0) {
      console.log(`⚠️ El usuario '${adminUser}' ya existe. No se realizaron cambios.`);
      process.exit(0);
    }
    
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(adminPass, salt);
    
    // Insertar
    await pool.query(
      `INSERT INTO usuarios (usuario, email, password_hash, rol, nombre_completo) VALUES (?, 'admin@clorinda.gob.ar', ?, 'admin_total', 'Administrador Sistema')`,
      [adminUser, hash]
    );

    console.log(`✅ Usuario administrador creado con éxito en la base de datos.`);
    console.log(`   Usuario: ${adminUser}`);
    console.log(`   Contraseña: ${adminPass}`);
    console.log(`\n¡IMPORTANTE! Recuerda cambiar esta contraseña tras el primer inicio de sesión por motivos de seguridad.`);
  } catch (error) {
    console.error('❌ Error al crear el administrador:', error);
  } finally {
    process.exit(0);
  }
};

createAdmin();
