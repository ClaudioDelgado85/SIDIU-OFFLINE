# Proposal: Migración MySQL → SQLite (Modo Offline Local)

## Intent

El sistema depende de TiDB Cloud (MySQL remoto). La municipalidad de Clorinda necesita operar
sin internet en un servidor Windows 7 local. Migrar a SQLite embebida elimina la dependencia
de red y permite funcionamiento 100% offline para 5-10 usuarios LAN concurrentes.

## Scope

### In Scope
- Adaptador de compatibilidad en `config/database.js` — mock del pool mysql2 que ejecuta sobre sqlite3
- Motor de traducción SQL dinámica (regex runtime): CURDATE, NOW, DATE_ADD, DATE_SUB, DATEDIFF, MONTH, YEAR
- Schema SQLite completo: 12 tablas + 3 vistas
- Script de setup inicial: crea DB, aplica schema, siembra barrios y usuario admin
- Actualización de `.env` y `package.json`
- WAL mode + foreign_keys habilitados en la conexión

### Out of Scope
- Modificación de controllers (principio Open/Closed — ninguno se toca, excepto dashboardController por FIELD())
- Migración de datos históricos de TiDB (se arranca con DB limpia)
- Tests E2E Cypress (dependen de la app corriendo, se verifican manualmente)
- Cambios en el frontend (public/)

## Capabilities

### New Capabilities
- `database-adapter-sqlite`: adaptador que emula la interfaz del pool de mysql2 sobre sqlite3, con traducción SQL dinámica y soporte WAL
- `database-schema-sqlite`: DDL completo para SQLite (tablas, constraints, vistas calculadas)
- `database-setup-script`: script reproducible de inicialización offline (schema + seeds)

### Modified Capabilities
- None (los controllers no cambian, la interfaz pública del módulo database.js se mantiene idéntica)

## Approach

Adapter Pattern en una única capa (`config/database.js`). El mock del pool expone `execute()`,
`query()`, `getConnection()` con la misma firma que mysql2/promise. Regex interceptan el SQL
antes de enviarlo a sqlite3. Los controllers no necesitan saber qué motor corre por debajo.

## Affected Areas

| Área | Impacto | Descripción |
|------|---------|-------------|
| `config/database.js` | Modified | Reemplazar conexión MySQL por adaptador sqlite3 |
| `.env` | Modified | Agregar DB_CLIENT=sqlite + SQLITE_DB_PATH |
| `package.json` | Modified | Agregar sqlite3 ^5.1.6 |
| `database/schema_sqlite.sql` | New | DDL completo para SQLite |
| `scripts/setup_sqlite.js` | New | Script de init + seed (admin password: admin123) |
| `controllers/dashboardController.js` | Modified | FIELD() → CASE WHEN (ANSI SQL) |

## Risks

| Riesgo | Probabilidad | Mitigación |
|--------|-------------|------------|
| Query MySQL con sintaxis no cubierta por el traductor | Media | Probar con npm test post-migración; agregar regex al motor si falla |
| Concurrencia de escritura en SQLite | Baja | WAL mode activado — resuelve reads concurrentes durante writes |
| sqlite3 requiere compilación en Win7 | Baja | node-pre-gyp descarga binarios precompilados en npm install |

## Rollback Plan

1. Revertir `config/database.js` al contenido actual (MySQL pool)
2. Revertir `.env` eliminando DB_CLIENT y SQLITE_DB_PATH
3. El archivo `.db` de SQLite no afecta el código — puede dejarse o borrarse
4. `npm install` restaura mysql2 como driver activo

## Dependencies

- `sqlite3 ^5.1.6` — debe instalarse antes de correr setup
- Node.js v13.4 ya presente en servidor destino

## Success Criteria

- [ ] `node scripts/setup_sqlite.js` completa sin errores
- [ ] `node server.js` arranca con mensaje '✓ Conexión y chequeo exitoso a la base de datos local SQLite'
- [ ] `npm test` pasa las 9 suites existentes
- [ ] Login desde el frontend funciona con usuario admin / admin123
- [ ] CRUD de expedientes, intimaciones e infracciones operativo desde la UI
