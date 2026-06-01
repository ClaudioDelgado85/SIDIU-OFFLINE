// scripts/setup_sqlite.js
// Script de inicialización y siembra de base de datos SQLite

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

const dbPath = process.env.SQLITE_DB_PATH || './database/gestion_municipal.db';
const resetDatabase = process.env.SQLITE_RESET === 'true' || process.argv.includes('--reset');

console.log('=== INICIANDO SETUP DE SQLITE ===');
console.log(`Ruta de la base de datos: ${dbPath}`);
console.log(`Modo: ${resetDatabase ? 'reset completo' : 'inicializacion/verificacion sin borrar datos'}`);

// 1. Verificar y crear el directorio database/ si no existe
const dbDir = path.dirname(path.resolve(dbPath));
if (!fs.existsSync(dbDir)) {
  console.log(`Creando directorio: ${dbDir}`);
  fs.mkdirSync(dbDir, { recursive: true });
}

// 2. Respaldar base de datos existente solo si se pidio reset destructivo
if (resetDatabase && dbPath !== ':memory:' && fs.existsSync(dbPath)) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = `${dbPath}.bak-${timestamp}`;
  console.log(`Base de datos existente encontrada. Creando respaldo: ${backupPath}`);
  fs.copyFileSync(dbPath, backupPath);
}

// 3. Abrir la conexión a la base de datos
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('✗ Error al abrir la base de datos SQLite:', err.message);
    process.exit(1);
  }
  console.log('✓ Conectado a la base de datos SQLite.');
  
  // Habilitar claves foráneas
  db.run('PRAGMA foreign_keys = ON;', (err) => {
    if (err) {
      console.error('Error habilitando claves foráneas:', err.message);
    } else {
      console.log('✓ Claves foráneas habilitadas.');
      ejecutarSchema();
    }
  });
});

// 4. Ejecutar el DDL del esquema
function ejecutarSchema() {
  const schemaPath = path.join(__dirname, '../database/schema_sqlite.sql');
  console.log(`Leyendo esquema desde: ${schemaPath}`);
  
  if (!fs.existsSync(schemaPath)) {
    console.error('✗ Error: El archivo database/schema_sqlite.sql no existe.');
    db.close();
    process.exit(1);
  }

  let schemaSql = fs.readFileSync(schemaPath, 'utf8');

  if (!resetDatabase) {
    schemaSql = schemaSql
      .split(/\r?\n/)
      .filter(line => !/^\s*DROP\s+(TABLE|VIEW)\s+/i.test(line))
      .filter(line => !/^\s*PRAGMA\s+foreign_keys\s*=\s*OFF\s*;/i.test(line))
      .join('\n');
  }
  
  db.exec(schemaSql, (err) => {
    if (err) {
      console.error('✗ Error al aplicar el esquema SQLite:', err.message);
      db.close();
      process.exit(1);
    }
    console.log('✓ Esquema SQLite aplicado correctamente.');
    sembrarDatos();
  });
}

// 5. Sembrar datos estructurales
function sembrarDatos() {
  console.log('Sembrando datos iniciales...');
  
  db.serialize(() => {
    // 5.1 Sembrar 10 barrios principales
    const barrios = [
      'Centro',
      'Porteño',
      'Libertad',
      'Itatí',
      '1° de Mayo',
      'El Porteñito',
      'Guadalupe',
      'San José',
      'Belgrano',
      'Toba'
    ];
    
    const stmtBarrio = db.prepare('INSERT OR IGNORE INTO barrios (nombre, activo) VALUES (?, 1)');
    barrios.forEach(b => {
      stmtBarrio.run(b);
    });
    stmtBarrio.finalize();
    console.log(`✓ 10 barrios insertados/verificados.`);

    // 5.2 Sembrar configuración del sistema
    const configs = [
      ['nombre_sistema', 'Sistema de Gestión Municipal', 'Nombre del sistema'],
      ['municipio', 'Municipalidad de Clorinda', 'Nombre del municipio'],
      ['timeout_inactividad_minutos', '30', 'Tiempo de inactividad para cierre de sesión']
    ];
    
    const stmtConfig = db.prepare('INSERT OR IGNORE INTO configuracion_sistema (clave, valor, descripcion) VALUES (?, ?, ?)');
    configs.forEach(c => {
      stmtConfig.run(c[0], c[1], c[2]);
    });
    stmtConfig.finalize();
    console.log('✓ Configuración del sistema sembrada.');

    // 5.3 Sembrar catálogos de la aplicación
    const catalogos = [
      // tipo_intimacion
      ['tipo_intimacion', 'general', 'General', 1],
      ['tipo_intimacion', 'baldio', 'Terreno Baldío', 2],
      ['tipo_intimacion', 'vehiculo', 'Vehículo Abandonado', 3],
      
      // intimacion_por
      ['intimacion_por', 'escombros', 'Escombros', 1],
      ['intimacion_por', 'arena', 'Arena', 2],
      ['intimacion_por', 'construccion', 'Construcción sin autorización', 3],
      ['intimacion_por', 'agua_servida', 'Pérdida de agua servida', 4],
      ['intimacion_por', 'basura', 'Basura / Residuos', 5],
      ['intimacion_por', 'otros', 'Otros', 99],
      
      // motivo_expediente
      ['motivo_expediente', 'habilitacion', 'Habilitación', 1],
      ['motivo_expediente', 'reempadronamiento', 'Reempadronamiento', 2],
      ['motivo_expediente', 'ampliacion_rubro', 'Ampliación de rubro', 3],
      ['motivo_expediente', 'cambio_rubro', 'Cambio de rubro', 4],
      ['motivo_expediente', 'traslado_local', 'Traslado de local', 5],
      ['motivo_expediente', 'cambio_titular', 'Cambio de titular', 6],
      ['motivo_expediente', 'cancelacion', 'Cancelación', 7],
      ['motivo_expediente', 'reclamos', 'Reclamos', 8],
      ['motivo_expediente', 'aprobacion_plano', 'Aprobación de plano', 9],
      ['motivo_expediente', 'oficio_juzgado', 'Oficio del juzgado', 10],
      ['motivo_expediente', 'otros', 'Otros', 99],
      
      // tipo_tarea_diaria
      ['tipo_tarea_diaria', 'operativo', 'Operativo', 1],
      ['tipo_tarea_diaria', 'administrativo', 'Administrativo', 2],
      ['tipo_tarea_diaria', 'inspeccion', 'Inspección', 3],
      ['tipo_tarea_diaria', 'limpieza', 'Limpieza', 4],
      ['tipo_tarea_diaria', 'notificacion', 'Notificación', 5],
      ['tipo_tarea_diaria', 'relevamiento', 'Relevamiento', 6],
      ['tipo_tarea_diaria', 'otros', 'Otros', 99]
    ];

    const stmtCatalogos = db.prepare('INSERT OR IGNORE INTO catalogos (categoria, valor, label, orden, activo) VALUES (?, ?, ?, ?, 1)');
    catalogos.forEach(c => {
      stmtCatalogos.run(c[0], c[1], c[2], c[3]);
    });
    stmtCatalogos.finalize();
    console.log('✓ Catálogos estructurales sembrados.');

    // 5.4 Sembrar contador de reclamos inicial
    const anioActual = new Date().getFullYear();
    db.run('INSERT OR IGNORE INTO contador_reclamos (anio, ultimo_numero) VALUES (?, 0)', [anioActual]);
    console.log(`✓ Contador de reclamos inicializado para el año ${anioActual}.`);

    // 5.5 Sembrar usuario admin con password 'admin123'
    const passwordHash = bcrypt.hashSync('admin123', 10);
    db.run(
      'INSERT OR IGNORE INTO usuarios (nombre_completo, usuario, email, password_hash, rol, activo) VALUES (?, ?, ?, ?, ?, 1)',
      ['Administrador General', 'admin', 'admin@clorinda.gov.ar', passwordHash, 'admin_total'],
      function(err) {
        if (err) {
          console.error('Error insertando usuario admin:', err.message);
          db.close();
          process.exit(1);
        }
        
        console.log('✓ Usuario administrador sembrado/verificado.');
        sembrarPermisosAdmin();
      }
    );
  });
}

// 6. Sembrar permisos de módulos para el usuario admin
function sembrarPermisosAdmin() {
  const modulos = [
    'expedientes',
    'intimaciones',
    'infracciones',
    'reclamos',
    'relevamientos',
    'comercios',
    'vendedores',
    'auditoria',
    'configuracion'
  ];

  db.serialize(() => {
    db.get("SELECT id FROM usuarios WHERE usuario = 'admin'", (err, row) => {
      if (err || !row) {
        console.error('No se pudo encontrar el ID del usuario admin para asignarle permisos.');
        db.close();
        process.exit(1);
      }
      
      const adminId = row.id;
      const stmtPermiso = db.prepare('INSERT OR IGNORE INTO permisos_modulos (usuario_id, modulo, habilitado) VALUES (?, ?, 1)');
      modulos.forEach(m => {
        stmtPermiso.run(adminId, m);
      });
      stmtPermiso.finalize((err) => {
        if (err) {
          console.error('Error sembrando permisos para el admin:', err.message);
        } else {
          console.log('✓ Permisos de módulos asignados al usuario administrador.');
          console.log('=== SETUP COMPLETADO CON ÉXITO ===');
        }
        db.close();
      });
    });
  });
}
