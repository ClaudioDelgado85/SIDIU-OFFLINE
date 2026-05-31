## Exploration: migracion-sqlite

### Current State
- `config/database.js`: pool mysql2 puro apuntando a TiDB Cloud
- `.env`: credenciales TiDB activas (DB_HOST, DB_USER, DB_PASSWORD, DB_SSL)
- Ninguno de los archivos nuevos del plan existe todavía (schema_sqlite.sql, setup_sqlite.js)
- 16 controllers usan `pool.execute()` — ninguno debe modificarse
- 9 suites Jest en `tests/controllers/` usando supertest + `loginAsAdmin(password: 'admin123')`
- `tests/setup.js` espera admin con password `'admin123'`

### Critical Risk
Divergencia de contraseña: `setup_sqlite.js` del plan original crea admin con `'AdminClorinda2026'`,
pero los tests Jest usan `'admin123'`. Todos los tests fallarán si corren contra SQLite.
**Solución**: cambiar password del seed a `'admin123'` para alinear con los tests.

### Affected Files
- `config/database.js` — REPLACE (adaptador mysql2-mock sobre sqlite3)
- `.env` — MODIFY (agregar DB_CLIENT=sqlite + SQLITE_DB_PATH)
- `package.json` — MODIFY (agregar sqlite3 ^5.1.6)
- `database/schema_sqlite.sql` — NEW (DDL SQLite completo + 3 vistas)
- `scripts/setup_sqlite.js` — NEW (init + seed barrios + admin)

### Recommendation
Ejecutar el plan tal como está diseñado. Única corrección: password del admin seed = `'admin123'` para que los tests pasen.
