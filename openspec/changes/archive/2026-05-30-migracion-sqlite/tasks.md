# Tasks: Migración MySQL → SQLite

## Phase 1: Infraestructura y Dependencias

- [x] 1.1 `package.json` — agregar `"sqlite3": "^5.1.6"` en `dependencies`
- [x] 1.2 `.env` — agregar bloque SQLite: `DB_CLIENT=sqlite` y `SQLITE_DB_PATH=./database/gestion_municipal.db` (preservar bloque MySQL existente comentado)
- [x] 1.3 Crear directorio `database/` si no existe (ya existe — verificar)

## Phase 2: Schema SQLite

- [x] 2.1 Crear `database/schema_sqlite.sql` con las 12 tablas usando `CREATE TABLE IF NOT EXISTS` y tipos SQLite (INTEGER, TEXT)
- [x] 2.2 Agregar en `schema_sqlite.sql`: tablas `barrios`, `contador_reclamos`, `usuarios`, `permisos_modulos`, `configuracion_sistema`
- [x] 2.3 Agregar en `schema_sqlite.sql`: tablas `expedientes`, `infracciones`, `intimaciones`, `reclamos`, `relevamientos`, `comercios`, `vendedores_ambulantes` con FOREIGN KEY a barrios
- [x] 2.4 Agregar en `schema_sqlite.sql`: vista `vista_alertas_intimaciones` con lógica de fechas nativa SQLite (`julianday`, `date()`)
- [x] 2.5 Agregar en `schema_sqlite.sql`: vistas `vista_dashboard_resumen` y `vista_historial_contribuyente` con `strftime` en lugar de `MONTH()`/`YEAR()`

## Phase 3: Adaptador de Base de Datos

- [x] 3.1 Reescribir `config/database.js`: agregar guard `if (DB_CLIENT === 'mysql')` que exporta el pool original de mysql2 y hace `return`
- [x] 3.2 Implementar `translateQuery(sql)` en `config/database.js`: regex para `CURDATE()`, `NOW()`, `DATE_SUB()`, `DATE_ADD()` con intervalos numéricos fijos
- [x] 3.3 Completar `translateQuery()`: regex para `DATE_ADD()` con columna dinámica (concatenación `||`), `DATEDIFF()`, `TO_DAYS()`, `MONTH()`, `YEAR()`
- [x] 3.4 Implementar `dbRun()` y `dbAll()` promisificados sobre `sqlite3.Database`
- [x] 3.5 Implementar `promisePoolMock` con métodos `execute()` and `getConnection()` que detectan SELECT vs DML y retornan en formato mysql2
- [x] 3.6 Activar `PRAGMA journal_mode=WAL` and `PRAGMA foreign_keys=ON` en el callback de apertura de la DB
- [x] 3.7 Exportar `{ pool: promisePoolMock, testConnection, query }` desde `config/database.js`

## Phase 4: Script de Setup

- [x] 4.1 Crear `scripts/setup_sqlite.js`: verificar/crear directorio `database/`, respaldar DB existente como `.db.bak-{timestamp}`
- [x] 4.2 En `setup_sqlite.js`: leer `schema_sqlite.sql` con `fs.readFileSync` y ejecutar con `db.exec()`
- [x] 4.3 En `setup_sqlite.js`: sembrar 10 barrios con `INSERT OR IGNORE` vía `db.prepare().run()`
- [x] 4.4 En `setup_sqlite.js`: sembrar `configuracion_sistema` (timeout_inactividad_minutos=30)
- [x] 4.5 En `setup_sqlite.js`: crear usuario admin con `bcrypt.hash('admin123', 10)` y `INSERT OR IGNORE` (**password: admin123**, no AdminClorinda2026)

## Phase 5: Corrección dashboard (FIELD → CASE WHEN)

- [x] 5.1 En `controllers/dashboardController.js`: reemplazar `ORDER BY FIELD(r.prioridad, 'urgente', 'alta', 'media', 'baja')` por `ORDER BY CASE WHEN r.prioridad='urgente' THEN 1 WHEN r.prioridad='alta' THEN 2 WHEN r.prioridad='media' THEN 3 ELSE 4 END`

## Phase 6: Testing y Verificación

- [x] 6.1 Ejecutar `node scripts/setup_sqlite.js` y verificar salida: tablas creadas, admin y barrios sembrados
- [x] 6.2 Verificar arranque: `node server.js` debe mostrar `✓ Conexión y chequeo exitoso a la base de datos local SQLite`
- [x] 6.3 Ejecutar `npm test` — los 9 test suites (auth, usuarios, expedientes, intimaciones, infracciones, reclamos, comercios, vendedores, dashboard) deben pasar
- [x] 6.4 Verificar que login manual desde el frontend funciona con usuario `admin` / `admin123`
- [x] 6.5 Verificar CRUD completo de intimaciones desde la UI (crear, editar, eliminar, foto)
