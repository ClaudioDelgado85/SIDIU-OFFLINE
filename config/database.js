// config/database.js
// Configuración de conexión a MySQL

const mysql = require('mysql2');
require('dotenv').config();

// Crear pool de conexiones
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'gestion_municipal',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Promisificar para usar async/await
const promisePool = pool.promise();

// Función para probar la conexión
const testConnection = async () => {
  try {
    const connection = await promisePool.getConnection();
    console.log('✓ Conexión exitosa a la base de datos MySQL');
    connection.release();
    return true;
  } catch (error) {
    console.error('✗ Error al conectar a la base de datos:', error.message);
    return false;
  }
};

// Función para ejecutar queries
const query = async (sql, params) => {
  try {
    const [results] = await promisePool.execute(sql, params);
    return results;
  } catch (error) {
    console.error('Error en query:', error);
    throw error;
  }
};

module.exports = {
  pool: promisePool,
  testConnection,
  query
};
