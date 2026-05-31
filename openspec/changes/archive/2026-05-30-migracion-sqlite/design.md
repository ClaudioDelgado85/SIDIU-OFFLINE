# Design: Migración MySQL → SQLite

## Technical Approach

Adapter Pattern de una sola capa en `config/database.js`. El módulo exporta exactamente la misma
interfaz pública que hoy (`pool`, `testConnection`, `query`). El mock del pool intercepta cada SQL,
ejecuta el motor de traducción, y despacha a sqlite3. Los 16 controllers no cambian.

## Architecture Decisions

### Decision: Un único archivo de configuración como capa de adaptación
**Choice**: Toda la lógica de compatibilidad vive en `config/database.js`. Los controllers ven la misma API de siempre.
**Alternatives considered**: (a) Crear una clase `SqliteAdapter` separada, (b) Modificar cada controller.
**Rationale**: Opción mínima de riesgo. Si algo falla, hay un único punto de revertir. No requiere refactoring.

### Decision: Traducción SQL por Regex en Runtime
**Choice**: Regex aplicadas en orden sobre cada query string antes de enviarse a sqlite3.
**Alternatives considered**: Parser SQL completo (ej. node-sql-parser).
**Rationale**: Las queries del proyecto son predecibles y acotadas. Un parser SQL agrega complejidad
y una dependencia extra que no se puede compilar fácilmente en Win7.

### Decision: FIELD() de MySQL — traducción manual en dashboard
**Choice**: La query de `dashboardController.js` que usa `ORDER BY FIELD(r.prioridad, ...)` debe
reescribirse como `ORDER BY CASE WHEN r.prioridad='urgente' THEN 1 WHEN r.prioridad='alta' THEN 2
WHEN r.prioridad='media' THEN 3 ELSE 4 END`.
**Alternatives considered**: Agregar regex para FIELD() al motor de traducción.
**Rationale**: FIELD() con múltiples argumentos variables es imposible de traducir de forma confiable
con regex. El CASE WHEN es ANSI SQL y funciona en ambos motores. Es el único controller que requiere
una modificación menor (solo esa query, no la lógica de negocio).

### Decision: Password del admin seed = 'admin123'
**Choice**: `setup_sqlite.js` crea el admin con password `admin123` (no `AdminClorinda2026` como
dice el plan original).
**Rationale**: `tests/setup.js` hardcodea ese password. Todos los tests de integración fallan si diverge.

## Data Flow

```
Controller
    |  db.pool.execute(sql, params)
    v
config/database.js (mock pool)
    |  translateQuery(sql)  -- regex engine
    |  cleanParams(params)  -- undefined -> null
    v
sqlite3.Database
    |  dbAll(sql) / dbRun(sql)
    v
Controller  <-- [rows, undefined] o [okPacket, undefined]
```

## File Changes

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `config/database.js` | Modify | Reemplazar pool MySQL por mock adaptador sqlite3 |
| `.env` | Modify | Agregar DB_CLIENT=sqlite + SQLITE_DB_PATH (preservar bloque MySQL) |
| `package.json` | Modify | Agregar sqlite3 ^5.1.6 en dependencies |
| `database/schema_sqlite.sql` | Create | DDL completo (12 tablas + 3 vistas) |
| `scripts/setup_sqlite.js` | Create | Script de init + seed barrios + admin |
| `controllers/dashboardController.js` | Modify | Reemplazar ORDER BY FIELD() por CASE WHEN (ANSI SQL) |

## Interfaces / Contracts

Interfaz pública de `config/database.js` (no cambia antes ni después de la migración):
```js
module.exports = {
  pool: { execute(sql, params) },   // retorna Promise<[rows|okPacket, undefined]>
  testConnection(),                  // retorna Promise<boolean>
  query(sql, params)                 // helper = pool.execute()[0]
}
```

## Testing Strategy

| Layer | Qué testear | Cómo |
|-------|------------|------|
| Unit | Motor de traducción `translateQuery()` | Jest puro, sin DB real |
| Integration | Los 9 test suites existentes via supertest | `npm test` contra DB SQLite |
| E2E | Flujos críticos (login, CRUD expediente, intimación) | Cypress manual post-deploy |

**Setup de tests**: crear `.env.test` con `DB_CLIENT=sqlite` y `SQLITE_DB_PATH=:memory:`
(SQLite soporta DB en memoria) para que Jest corra sin archivos físicos.

## Migration / Rollout

1. `npm install` (descarga sqlite3 con binarios precompilados)
2. `node scripts/setup_sqlite.js` (crea DB, aplica schema, siembra datos)
3. `node server.js` → verificar `✓ Conexión y chequeo exitoso a la base de datos local SQLite`
4. `npm test` → validar 9/9 suites

## Open Questions

- [ ] ¿Tests Jest con SQLite en **memoria** (`:memory:`) o con un **archivo** `.db` dedicado para test?
  Impacta cómo configurar `.env.test`. (No bloquea la implementación.)
