# Delta for database-adapter-sqlite

# database-adapter-sqlite Specification

## Purpose
Adaptador que emula la interfaz del pool mysql2/promise sobre sqlite3. Intercepta queries SQL,
las traduce al dialecto SQLite, y retorna resultados en el mismo formato que mysql2 para que
los controllers no necesiten modificarse.

## Requirements

### Requirement: Interfaz Compatible con mysql2
El adaptador MUST exportar un objeto con `pool.execute(sql, params)`, `pool.getConnection()`,
`query(sql, params)` y `testConnection()` con las mismas firmas que mysql2/promise.

#### Scenario: SELECT retorna [rows, undefined]
- GIVEN DB_CLIENT=sqlite configurado
- WHEN un controller llama `pool.execute('SELECT * FROM usuarios', [])`
- THEN retorna `[Array<Object>, undefined]`
- AND cada objeto tiene las mismas claves que las columnas de la tabla

#### Scenario: INSERT/UPDATE/DELETE retorna okPacket
- GIVEN DB_CLIENT=sqlite configurado
- WHEN un controller llama `pool.execute('INSERT INTO barrios...', [params])`
- THEN retorna `[{ insertId, affectedRows, warningStatus: 0 }, undefined]`

#### Scenario: Fallback a MySQL si DB_CLIENT != sqlite
- GIVEN DB_CLIENT=mysql (o no definido)
- WHEN el módulo se carga
- THEN conecta a MySQL usando las variables DB_HOST/USER/PASSWORD/NAME
- AND exporta el promisePool real de mysql2

### Requirement: Traducción SQL Dinámica
El adaptador MUST traducir en tiempo de ejecución las funciones MySQL al equivalente SQLite
antes de ejecutar cada query.

#### Scenario: Funciones de fecha simples
- GIVEN una query contiene `CURDATE()` o `NOW()`
- WHEN pasa por el motor de traducción
- THEN `CURDATE()` → `date('now','localtime')` y `NOW()` → `datetime('now','localtime')`

#### Scenario: DATE_ADD y DATE_SUB con columna dinámica
- GIVEN una query contiene `DATE_ADD(i.fecha, INTERVAL i.plazo_dias DAY)`
- WHEN pasa por el motor de traducción
- THEN se convierte a `date(i.fecha, '+' || i.plazo_dias || ' days')`

#### Scenario: DATEDIFF, MONTH, YEAR
- GIVEN una query usa DATEDIFF, MONTH o YEAR
- WHEN pasa por el motor
- THEN DATEDIFF → `cast(julianday(f1)-julianday(f2) as integer)`, MONTH/YEAR → `cast(strftime('%m'/'%Y', f) as integer)`

### Requirement: WAL Mode y Foreign Keys
Al abrir la base de datos, el adaptador MUST ejecutar `PRAGMA journal_mode=WAL` y
`PRAGMA foreign_keys=ON`.

#### Scenario: Pragmas activados al conectar
- GIVEN SQLITE_DB_PATH apunta a un archivo válido
- WHEN la aplicación inicia
- THEN ambos PRAGMAs se ejecutan antes de procesar cualquier request
