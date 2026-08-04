# Plan de Migración a Servidor Local Windows 7 y SQLite

Este documento representa el **diseño arquitectónico** detallado para la migración del Sistema de Gestión Municipal de la Municipalidad de Clorinda. El objetivo principal es desacoplar el sistema de una base de datos remota en la nube (MySQL en TiDB/Render) para que funcione en un **servidor físico local bajo Windows 7**, utilizando **SQLite** como base de datos embebida.

Como **Arquitecto de Software**, he estructurado este plano técnico para que vos, como **Maestro Mayor de Obras (Programador/Implementador)**, puedas ejecutar la obra paso a paso de forma limpia, robusta y sin alterar la lógica de negocio en los controladores de la aplicación.

---

## Decisiones de Arquitectura (La Visión del Arquitecto)

### 1. Patrón de Compatibilidad Sin Refactorización Masiva
Modificar manualmente cada consulta SQL en los controladores para adaptarla a la sintaxis de SQLite es un **anti-patrón costoso y propenso a errores**. Rompe el principio de *Abierto/Cerrado (SOLID)* y hace que sea imposible volver a MySQL en el futuro.
*   **Solución**: Diseñamos una **Capa de Adaptación en el Driver (`config/database.js`)**. Este adaptador emula exactamente la interfaz del pool de conexiones de `mysql2` (métodos `execute` y `query` que retornan promesas y el formato de salida `[rows, fields]`).
*   **Motor de Traducción Dinámica**: El adaptador interceptará cada query SQL recibida y aplicará expresiones regulares (Regex) para traducir en tiempo de ejecución las funciones específicas de MySQL (`CURDATE()`, `NOW()`, `DATE_ADD()`, `DATE_SUB()`, `DATEDIFF()`, `MONTH()`, `YEAR()`) a su equivalente semántico en SQLite.

### 2. Soporte Estricto para Windows 7 (Legacy Node.js Environment)
Windows 7 es un entorno heredado. Node.js v14+ requiere parches o configuraciones especiales, y compilar módulos nativos como `sqlite3` mediante `node-gyp` (que exige instalar Python y Visual Studio Build Tools en la máquina) puede ser un dolor de cabeza en un servidor municipal offline.
*   **Solución**: 
    1.  Recomendar estrictamente **Node.js v12.22.12 (LTS)** o **v13.6.0**, que son 100% compatibles nativamente con Windows 7 sin parches.
    2.  Instalar la biblioteca `sqlite3` asegurando que use sus binarios precompilados (`node-pre-gyp`) para evitar la fase de compilación local en el servidor local.

---

## Advertencias Estructurales

> [!IMPORTANT]
> **Compatibilidad de Motores SQL**: SQLite no valida tipos de datos de forma estricta (usa *dynamic typing*). Esto es una ventaja para la flexibilidad, pero debés cuidar que los inserts envíen los tipos correctos.
> Las vistas SQL complejas que tenían lógica de negocio de fechas se han rediseñado por completo en un script SQL específico para SQLite, eliminando las dependencias de funciones MySQL.

> [!WARNING]
> **Concurrencia en SQLite**: SQLite bloquea la base de datos completa para operaciones de escritura (`INSERT`/`UPDATE`/`DELETE`). Para un entorno local municipal de red interna (LAN) con 5-10 usuarios concurrentes, esto es perfectamente viable y el motor lo maneja por colas de forma transparente. Sin embargo, se debe habilitar el modo **WAL (Write-Ahead Logging)** en SQLite para permitir lecturas concurrentes mientras se escribe.

---

## Puntos de Control y Decisiones Tomadas

*   **Migración de Datos**: Se ha decidido arrancar con una **base de datos limpia desde cero**, cargando solo los catálogos estructurales de barrios y las configuraciones iniciales del sistema.
*   **Entorno Físico**: Se confirma la presencia de **Node v13.4** en el servidor de destino, lo cual es ideal y elimina la necesidad de reinstalar Node.js.

---

## Proposed Changes

A continuación se detallan los planos de los archivos que debés modificar o crear. Están ordenados lógicamente desde la base (dependencias) hasta el techo (scripts de arranque).

---

### Componente: Dependencias y Variables de Entorno

#### [MODIFY] [package.json](file:///C:/Users/Estudiante/Downloads/proyecto%20SIDIU%20OFFLINE/package.json)
Debemos agregar la dependencia de `sqlite3` y mantener `mysql2` opcional.

```json
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "docx": "^9.6.1",
    "dotenv": "^16.3.1",
    "express": "^4.18.2",
    "express-rate-limit": "^7.1.5",
    "express-validator": "^7.0.1",
    "helmet": "^7.1.0",
    "jsonwebtoken": "^9.0.2",
    "multer": "^2.1.1",
    "mysql2": "^3.6.5",
    "sqlite3": "^5.1.6"
  }
```

#### [MODIFY] [.env](file:///C:/Users/Estudiante/Downloads/proyecto%20SIDIU%20OFFLINE/.env)
Configuramos las variables para indicarle al sistema que trabajará con SQLite en modo local.

```env
# Configuración del Servidor Local
PORT=3000
NODE_ENV=production

# Estrategia de Base de Datos (sqlite | mysql)
DB_CLIENT=sqlite
SQLITE_DB_PATH=./database/gestion_municipal.db

# Configuración JWT (Autenticación)
JWT_SECRET=tu_clave_secreta_local_generada_al_instalar_12345
JWT_EXPIRES_IN=12h

# Configuración CORS (Habilitar acceso de red local LAN)
CORS_ORIGIN=*
```

---

### Componente: Conector de Base de Datos (Adaptador de Compatibilidad)

#### [MODIFY] [database.js](file:///C:/Users/Estudiante/Downloads/proyecto%20SIDIU%20OFFLINE/config/database.js)
Aquí está la magia del arquitecto. Reemplazamos la conexión directa de MySQL por un mock del pool de conexiones. Este archivo interceptará las consultas SQL y las traducirá dinámicamente antes de ejecutarlas en SQLite.

```javascript
// config/database.js
// Capa de Adaptación y Compatibilidad MySQL -> SQLite
// Diseñado para correr localmente en Windows 7 sin alterar controladores

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

const dbClient = process.env.DB_CLIENT || 'mysql';

// Si se prefiere seguir usando MySQL (estrategia original)
if (dbClient === 'mysql') {
  const mysql = require('mysql2');
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gestion_municipal',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true
  };
  if (process.env.DB_SSL === 'true') {
    dbConfig.ssl = { rejectUnauthorized: false };
  }
  const pool = mysql.createPool(dbConfig);
  const promisePool = pool.promise();

  module.exports = {
    pool: promisePool,
    testConnection: async () => {
      try {
        const conn = await promisePool.getConnection();
        console.log('✓ Conexión exitosa a la base de datos MySQL');
        conn.release();
        return true;
      } catch (err) {
        console.error('✗ Error al conectar a MySQL:', err.message);
        return false;
      }
    },
    query: async (sql, params) => {
      const [results] = await promisePool.execute(sql, params);
      return results;
    }
  };
  return;
}

// =========================================================================
// ESTRATEGIA SQLITE (WINDOWS 7 LOCAL)
// =========================================================================

const dbPath = path.resolve(process.cwd(), process.env.SQLITE_DB_PATH || './database/gestion_municipal.db');

// Crear y configurar la instancia de la base de datos física SQLite
const dbInstance = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('✗ Error al abrir la base de datos SQLite:', err.message);
  } else {
    console.log(`✓ Base de datos SQLite abierta en: ${dbPath}`);
    // Activar modo WAL para optimizar lectura/escritura concurrente
    dbInstance.run('PRAGMA journal_mode = WAL');
    // Forzar validación de Foreign Keys
    dbInstance.run('PRAGMA foreign_keys = ON');
  }
});

/**
 * Motor de Traducción de SQL Dinámico
 * Convierte funciones complejas de MySQL al estándar compatible de SQLite
 */
function translateQuery(sql) {
  if (!sql) return sql;
  let translated = sql;

  // 1. Reemplazar funciones de fecha básicas
  translated = translated.replace(/CURDATE\(\)/gi, "date('now', 'localtime')");
  translated = translated.replace(/NOW\(\)/gi, "datetime('now', 'localtime')");

  // 2. Traducir DATE_SUB(fecha, INTERVAL X MONTH/DAY/YEAR)
  // MySQL: DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
  // SQLite: date('now', 'localtime', '-6 months')
  translated = translated.replace(/DATE_SUB\(([^,]+),\s*INTERVAL\s+(\d+)\s+([A-Z]+)\)/gi, (match, dateExpr, amount, unit) => {
    const cleanDate = dateExpr.trim();
    const cleanUnit = unit.toLowerCase().trim() + 's'; // day -> days, month -> months
    return `datetime(${cleanDate}, '-${amount} ${cleanUnit}')`;
  });

  // 3. Traducir DATE_ADD(fecha, INTERVAL X MONTH/DAY/YEAR)
  // MySQL: DATE_ADD(i.fecha, INTERVAL i.plazo_dias DAY)
  // SQLite: date(i.fecha, '+' || i.plazo_dias || ' days')
  translated = translated.replace(/DATE_ADD\(([^,]+),\s*INTERVAL\s+([^ ]+)\s+([A-Z]+)\)/gi, (match, dateExpr, amountExpr, unit) => {
    const cleanDate = dateExpr.trim();
    const cleanAmount = amountExpr.trim();
    const cleanUnit = unit.toLowerCase().trim() + 's';

    // Si el intervalo es un número directo
    if (!isNaN(cleanAmount)) {
      return `date(${cleanDate}, '+${cleanAmount} ${cleanUnit}')`;
    }
    // Si el intervalo es una columna o expresión dinámica
    return `date(${cleanDate}, '+' || ${cleanAmount} || ' ${cleanUnit}')`;
  });

  // 4. Traducir DATEDIFF(fecha1, fecha2)
  // MySQL: DATEDIFF(fecha1, fecha2) (retorna días enteros)
  // SQLite: cast(julianday(fecha1) - julianday(fecha2) as integer)
  translated = translated.replace(/DATEDIFF\(([^,]+),\s*([^)]+)\)/gi, 'cast(julianday($1) - julianday($2) as integer)');

  // 5. Traducir TO_DAYS(fecha)
  translated = translated.replace(/TO_DAYS\(([^)]+)\)/gi, 'cast(julianday($1) as integer)');

  // 6. Traducir MONTH(fecha) y YEAR(fecha)
  // MySQL: MONTH(fecha) -> SQLite: cast(strftime('%m', fecha) as integer)
  translated = translated.replace(/MONTH\(([^)]+)\)/gi, "cast(strftime('%m', $1) as integer)");
  translated = translated.replace(/YEAR\(([^)]+)\)/gi, "cast(strftime('%Y', $1) as integer)");

  return translated;
}

// Promisificar operaciones básicas de sqlite3
const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    dbInstance.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this); // Retorna { lastID, changes }
    });
  });
};

const dbAll = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    dbInstance.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

// Mock del objeto Pool de mysql2 para evitar cambiar el código de los controllers
const promisePoolMock = {
  execute: async (sql, params = []) => {
    const translatedSql = translateQuery(sql);
    const cleanParams = params.map(p => p === undefined ? null : p);
    const isSelect = /^\s*SELECT/i.test(translatedSql) || /^\s*WITH/i.test(translatedSql);

    if (isSelect) {
      const rows = await dbAll(translatedSql, cleanParams);
      return [rows, undefined];
    } else {
      const result = await dbRun(translatedSql, cleanParams);
      const okPacket = {
        insertId: result.lastID,
        affectedRows: result.changes,
        warningStatus: 0
      };
      return [okPacket, undefined];
    }
  },
  getConnection: async () => {
    return {
      execute: promisePoolMock.execute,
      release: () => {}
    };
  }
};

module.exports = {
  pool: promisePoolMock,
  testConnection: async () => {
    try {
      await dbAll("SELECT 1");
      console.log('✓ Conexión y chequeo exitoso a la base de datos local SQLite');
      return true;
    } catch (error) {
      console.error('✗ Error al validar SQLite:', error.message);
      return false;
    }
  },
  query: async (sql, params) => {
    const [results] = await promisePoolMock.execute(sql, params);
    return results;
  }
};
```

---

### Componente: Esquema de Base de Datos Local

#### [NEW] [schema_sqlite.sql](file:///C:/Users/Estudiante/Downloads/proyecto%20SIDIU%20OFFLINE/database/schema_sqlite.sql)
DDL simplificado y adaptado para SQLite. 

```sql
-- database/schema_sqlite.sql
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS barrios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL UNIQUE,
  activo INTEGER DEFAULT 1,
  fecha_creacion TEXT DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS contador_reclamos (
  anio INTEGER PRIMARY KEY,
  ultimo_numero INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre_completo TEXT NOT NULL,
  usuario TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  rol TEXT CHECK(rol IN ('admin_total','carga','consulta')) NOT NULL,
  activo INTEGER DEFAULT 1,
  fecha_creacion TEXT DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS permisos_modulos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER NOT NULL,
  modulo TEXT NOT NULL,
  habilitado INTEGER DEFAULT 0,
  FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS configuracion_sistema (
  clave TEXT PRIMARY KEY,
  valor TEXT NOT NULL,
  descripcion TEXT,
  fecha_actualizacion TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS expedientes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fecha TEXT NOT NULL,
  numero_expediente TEXT NOT NULL UNIQUE,
  nombre_apellido TEXT NOT NULL,
  dni TEXT NOT NULL,
  motivo TEXT NOT NULL,
  direccion TEXT,
  numero_partida TEXT,
  estado TEXT CHECK(estado IN ('ingreso','en_inspeccion','plazo_otorgado','salida')) NOT NULL DEFAULT 'ingreso',
  fecha_inspeccion TEXT,
  plazo_dias INTEGER,
  fecha_salida TEXT,
  observaciones TEXT,
  fecha_creacion TEXT DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TEXT DEFAULT CURRENT_TIMESTAMP,
  barrio_id INTEGER,
  FOREIGN KEY (barrio_id) REFERENCES barrios (id)
);

CREATE TABLE IF NOT EXISTS infracciones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fecha TEXT NOT NULL,
  nombre_apellido TEXT NOT NULL,
  dni TEXT NOT NULL,
  numero_acta TEXT NOT NULL UNIQUE,
  direccion TEXT NOT NULL,
  motivo_infraccion TEXT NOT NULL,
  observaciones TEXT,
  fecha_creacion TEXT DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TEXT DEFAULT CURRENT_TIMESTAMP,
  barrio_id INTEGER,
  FOREIGN KEY (barrio_id) REFERENCES barrios (id)
);

CREATE TABLE IF NOT EXISTS intimaciones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fecha TEXT NOT NULL,
  tipo TEXT CHECK(tipo IN ('general','baldio','vehiculo')) NOT NULL,
  nombre_apellido TEXT NOT NULL,
  dni TEXT NOT NULL,
  direccion TEXT NOT NULL,
  tipo_obstruccion TEXT,
  plazo_dias INTEGER DEFAULT 0,
  numero_intimacion INTEGER DEFAULT 1,
  dio_cumplimiento INTEGER DEFAULT 0,
  fecha_subsanacion TEXT,
  observaciones TEXT,
  estado TEXT CHECK(estado IN ('vigente','proxima_vencer','vencida','cumplida','reiterada','infraccionado')) DEFAULT 'vigente',
  infraccion_realizada INTEGER DEFAULT 0,
  numero_infraccion TEXT,
  fecha_infraccion TEXT,
  propietario_no_ubicado INTEGER DEFAULT 0,
  marca TEXT,
  modelo TEXT,
  color TEXT,
  dominio TEXT,
  fecha_retiro TEXT,
  lugar_deposito TEXT,
  foto_inicial TEXT,
  foto_actual TEXT,
  fecha_creacion TEXT DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TEXT DEFAULT CURRENT_TIMESTAMP,
  barrio_id INTEGER,
  FOREIGN KEY (barrio_id) REFERENCES barrios (id)
);

CREATE TABLE IF NOT EXISTS reclamos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  numero_reclamo TEXT NOT NULL UNIQUE,
  fecha_creacion TEXT DEFAULT CURRENT_TIMESTAMP,
  tipo_reclamo TEXT CHECK(tipo_reclamo IN ('alumbrado','baldio','ruidos','animales','cloacas','obras','varios')) NOT NULL,
  descripcion TEXT NOT NULL,
  direccion_incidente TEXT NOT NULL,
  denunciado_nombre TEXT,
  denunciado_dni TEXT,
  denunciado_direccion TEXT,
  foto_url TEXT,
  vecino_nombre TEXT,
  vecino_telefono TEXT,
  estado TEXT CHECK(estado IN ('pendiente','en_proceso','resuelto','anulado')) DEFAULT 'pendiente',
  prioridad TEXT CHECK(prioridad IN ('baja','media','alta','urgente')) DEFAULT 'media',
  fecha_resolucion TEXT,
  observaciones_resolucion TEXT,
  usuario_creador_id INTEGER,
  barrio_id INTEGER,
  fecha_actualizacion TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (barrio_id) REFERENCES barrios (id),
  FOREIGN KEY (usuario_creador_id) REFERENCES usuarios (id)
);

CREATE TABLE IF NOT EXISTS relevamientos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  numero_relevamiento TEXT NOT NULL UNIQUE,
  fecha_relevamiento TEXT NOT NULL,
  tipo_relevamiento TEXT CHECK(tipo_relevamiento IN ('baldio','obra','ocupacion','comercio','varios')) NOT NULL,
  ubicacion TEXT NOT NULL,
  zona TEXT,
  responsable_nombre TEXT,
  responsable_dni TEXT,
  observaciones TEXT,
  foto_url TEXT,
  tiene_autorizacion INTEGER DEFAULT 0,
  paga_canon INTEGER DEFAULT 0,
  fecha_vencimiento_canon TEXT,
  fecha_creacion TEXT DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TEXT DEFAULT CURRENT_TIMESTAMP,
  barrio_id INTEGER,
  FOREIGN KEY (barrio_id) REFERENCES barrios (id)
);

CREATE TABLE IF NOT EXISTS comercios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre_propietario TEXT NOT NULL,
  dni_propietario TEXT NOT NULL,
  fecha_relevamiento TEXT NOT NULL,
  rubro TEXT,
  esta_habilitado INTEGER DEFAULT 0,
  direccion_comercial TEXT NOT NULL,
  barrio_id INTEGER,
  FOREIGN KEY (barrio_id) REFERENCES barrios (id)
);

CREATE TABLE IF NOT EXISTS vendedores_ambulantes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre_vendedor TEXT NOT NULL,
  dni_vendedor TEXT NOT NULL,
  fecha_relevamiento TEXT NOT NULL,
  rubro TEXT,
  tiene_autorizacion INTEGER DEFAULT 0,
  ubicacion TEXT NOT NULL,
  barrio_id INTEGER,
  FOREIGN KEY (barrio_id) REFERENCES barrios (id)
);

-- VISTAS
DROP VIEW IF EXISTS vista_alertas_intimaciones;
CREATE VIEW vista_alertas_intimaciones AS
SELECT
    i.id, i.tipo, i.nombre_apellido, i.dni, i.direccion,
    i.fecha AS fecha_intimacion,
    date(i.fecha, '+' || i.plazo_dias || ' days') AS fecha_vencimiento,
    i.plazo_dias, i.numero_intimacion, i.barrio_id,
    CASE
        WHEN i.dio_cumplimiento = 1 THEN 'cumplida'
        WHEN date('now', 'localtime') > date(i.fecha, '+' || i.plazo_dias || ' days') THEN 'vencida'
        WHEN (julianday(date(i.fecha, '+' || i.plazo_dias || ' days')) - julianday(date('now', 'localtime'))) <= 3 THEN 'proxima_vencer'
        ELSE 'vigente'
    END AS estado_calculado,
    cast(julianday(date(i.fecha, '+' || i.plazo_dias || ' days')) - julianday(date('now', 'localtime')) as integer) AS dias_restantes
FROM intimaciones i
WHERE i.dio_cumplimiento = 0 AND i.estado != 'reiterada';

DROP VIEW IF EXISTS vista_dashboard_resumen;
CREATE VIEW vista_dashboard_resumen AS
SELECT
    (SELECT COUNT(*) FROM expedientes WHERE strftime('%m', fecha) = strftime('%m', date('now', 'localtime')) AND strftime('%Y', fecha) = strftime('%Y', date('now', 'localtime'))) AS expedientes_mes,
    (SELECT COUNT(*) FROM intimaciones WHERE strftime('%m', fecha) = strftime('%m', date('now', 'localtime')) AND strftime('%Y', fecha) = strftime('%Y', date('now', 'localtime'))) AS intimaciones_mes,
    (SELECT COUNT(*) FROM infracciones WHERE strftime('%m', fecha) = strftime('%m', date('now', 'localtime')) AND strftime('%Y', fecha) = strftime('%Y', date('now', 'localtime'))) AS infracciones_mes,
    (SELECT COUNT(*) FROM reclamos WHERE strftime('%m', fecha_creacion) = strftime('%m', date('now', 'localtime')) AND strftime('%Y', fecha_creacion) = strftime('%Y', date('now', 'localtime'))) AS reclamos_mes,
    (SELECT COUNT(*) FROM relevamientos WHERE strftime('%m', fecha_relevamiento) = strftime('%m', date('now', 'localtime')) AND strftime('%Y', fecha_relevamiento) = strftime('%Y', date('now', 'localtime'))) AS relevamientos_mes,
    (SELECT COUNT(*) FROM intimaciones WHERE date('now', 'localtime') <= date(fecha, '+' || plazo_dias || ' days') AND (julianday(date(fecha, '+' || plazo_dias || ' days')) - julianday(date('now', 'localtime'))) <= 3 AND dio_cumplimiento = 0) AS alertas_proximas_vencer,
    (SELECT COUNT(*) FROM intimaciones WHERE date('now', 'localtime') > date(fecha, '+' || plazo_dias || ' days') AND dio_cumplimiento = 0) AS alertas_vencidas,
    (SELECT COUNT(*) FROM intimaciones WHERE dio_cumplimiento = 1 AND strftime('%m', fecha_subsanacion) = strftime('%m', date('now', 'localtime')) AND strftime('%Y', fecha_subsanacion) = strftime('%Y', date('now', 'localtime'))) AS alertas_cumplidas_mes;

DROP VIEW IF EXISTS vista_historial_contribuyente;
CREATE VIEW vista_historial_contribuyente AS
SELECT 'expediente' AS tipo, e.id, e.nombre_apellido, e.dni, e.fecha AS fecha_registro, e.numero_expediente AS numero, e.motivo AS descripcion, e.estado, NULL AS direccion, e.barrio_id FROM expedientes e
UNION ALL
SELECT 'intimacion', i.id, i.nombre_apellido, i.dni, i.fecha, (i.numero_intimacion || ' - ' || i.tipo), i.tipo_obstruccion, i.estado, i.direccion, i.barrio_id FROM intimaciones i
UNION ALL
SELECT 'infraccion', inf.id, inf.nombre_apellido, inf.dni, inf.fecha, inf.numero_acta, inf.motivo_infraccion, 'registrada', inf.direccion, inf.barrio_id FROM infracciones inf
UNION ALL
SELECT 'reclamo_denunciado', r.id, r.denunciado_nombre, r.denunciado_dni, r.fecha_creacion, r.numero_reclamo, r.tipo_reclamo, r.estado, r.denunciado_direccion, r.barrio_id FROM reclamos r
UNION ALL
SELECT 'relevamiento', rel.id, rel.responsable_nombre, rel.responsable_dni, rel.fecha_relevamiento, rel.numero_relevamiento, rel.ubicacion, CASE WHEN rel.tiene_autorizacion THEN 'autorizado' ELSE 'no_autorizado' END, rel.ubicacion, rel.barrio_id FROM relevamientos rel
UNION ALL
SELECT 'comercio', c.id, c.nombre_propietario, c.dni_propietario, c.fecha_relevamiento, NULL, c.rubro, CASE WHEN c.esta_habilitado THEN 'habilitado' ELSE 'no_habilitado' END, c.direccion_comercial, c.barrio_id FROM comercios c
UNION ALL
SELECT 'vendedor_ambulante', v.id, v.nombre_vendedor, v.dni_vendedor, v.fecha_relevamiento, NULL, v.rubro, CASE WHEN v.tiene_autorizacion THEN 'autorizado' ELSE 'no_autorizado' END, v.ubicacion, v.barrio_id FROM vendedores_ambulantes v;
```

---

### Componente: Inicialización de la Base de Datos

#### [NEW] [setup_sqlite.js](file:///C:/Users/Estudiante/Downloads/proyecto%20SIDIU%20OFFLINE/scripts/setup_sqlite.js)
Script inyector del schema y semillas iniciales.

```javascript
// scripts/setup_sqlite.js
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

const dbPath = path.resolve(__dirname, '../database/gestion_municipal.db');
const schemaPath = path.resolve(__dirname, '../database/schema_sqlite.sql');

console.log('🏗️ Iniciando la construcción de la base de datos SQLite...');

const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

if (fs.existsSync(dbPath)) {
  console.log('⚠️ Detectada base de datos previa. Respaldando antes de reconstruir...');
  fs.copyFileSync(dbPath, `${dbPath}.bak-${Date.now()}`);
  fs.unlinkSync(dbPath);
}

const db = new sqlite3.Database(dbPath, async (err) => {
  if (err) {
    console.error('✗ Error fatal al crear la base de datos:', err.message);
    process.exit(1);
  }
  
  console.log('🔨 Conectado. Aplicando schema...');
  
  try {
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schemaSql, async (execErr) => {
      if (execErr) {
        console.error('✗ Error al aplicar el schema:', execErr.message);
        db.close();
        process.exit(1);
      }
      
      console.log('✓ Tablas y Vistas creadas exitosamente.');
      
      db.serialize(async () => {
        console.log('📦 Sembrando catálogo de Barrios...');
        const barrios = [
          'Centro', 'Porteño Norte', 'Porteño Sur', 'Libertad', 'El Talar',
          'Guadalupe', '1° de Mayo', 'Felipe Solo', 'Marana', 'Belgrano'
        ];
        const stmtBarrio = db.prepare("INSERT OR IGNORE INTO barrios (nombre, activo) VALUES (?, 1)");
        barrios.forEach(b => stmtBarrio.run(b));
        stmtBarrio.finalize();

        db.run("INSERT OR REPLACE INTO configuracion_sistema (clave, valor, descripcion) VALUES (?, ?, ?)", 
          ['timeout_inactividad_minutos', '30', 'Tiempo de gracia antes de expirar la sesión del operador']
        );

        console.log('🔑 Creando usuario Administrador Principal...');
        const adminPass = 'AdminClorinda2026';
        const salt = await bcrypt.genSalt(10);
        const passHash = await bcrypt.hash(adminPass, salt);
        
        db.run(
          "INSERT OR IGNORE INTO usuarios (nombre_completo, usuario, email, password_hash, rol, activo) VALUES (?, ?, ?, ?, ?, ?)",
          ['Administrador General', 'admin', 'admin@clorinda.gov.ar', passHash, 'admin_total', 1],
          function(insertErr) {
            if (insertErr) {
              console.error('✗ Error al crear el admin:', insertErr.message);
            } else {
              console.log('======================================================');
              console.log('🚀 CONSTRUCCIÓN LOCAL COMPLETADA CON ÉXITO');
              console.log('======================================================');
              console.log('Datos de acceso administrativo inicial:');
              console.log(' -> Usuario: admin');
              console.log(' -> Contraseña:', adminPass);
              console.log('======================================================');
            }
            db.close();
          }
        );
      });
    });
  } catch (schemaReadError) {
    console.error('✗ Error al leer el plano schema_sqlite.sql:', schemaReadError.message);
    db.close();
    process.exit(1);
  }
});
```

---

## Guía de Obra: Instalación del Servidor Físico (Windows 7)

1.  **Copiar la carpeta completa** de este proyecto ya modificado a `C:\gestion-municipal` en la máquina local.
2.  Abrir la consola `cmd` en esa ruta.
3.  Instalar dependencias asegurando la descarga correcta del driver de SQLite precompilado:
    ```bash
    npm install --only=production
    ```
4.  Ejecutar el script constructor de base de datos local:
    ```bash
    node scripts/setup_sqlite.js
    ```
5.  Arrancar la aplicación local en el puerto 3000:
    ```bash
    npm start
    ```
6.  Abrir el puerto `3000` en el Firewall de Windows 7 en la red municipal para permitir el acceso desde las otras computadoras de la oficina (`http://[IP-DEL-SERVIDOR]:3000`).
