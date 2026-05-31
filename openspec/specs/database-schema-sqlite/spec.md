# database-schema-sqlite Specification

## Purpose
DDL completo para SQLite que define la estructura de datos del sistema: 12 tablas y 3 vistas
con lógica de fechas nativa SQLite.

## Requirements

### Requirement: Tablas con Tipos SQLite
El schema MUST definir las 12 tablas usando tipos SQLite (INTEGER, TEXT, REAL) con
`CREATE TABLE IF NOT EXISTS`.

#### Scenario: Creación idempotente
- GIVEN el schema se ejecuta sobre una DB existente
- WHEN se corre `db.exec(schemaSql)`
- THEN no lanza error ni borra datos existentes

#### Scenario: Foreign keys validadas
- GIVEN `PRAGMA foreign_keys=ON`
- WHEN se intenta insertar un registro con barrio_id inexistente
- THEN SQLite rechaza el INSERT con error de FK

### Requirement: Vistas con Lógica SQLite
El schema MUST incluir las 3 vistas con sintaxis nativa SQLite (sin funciones MySQL).

#### Scenario: vista_alertas_intimaciones calcula estado
- GIVEN intimaciones con plazo_dias y fecha
- WHEN se consulta la vista
- THEN cada fila tiene `estado_calculado` (vigente/proxima_vencer/vencida/cumplida)
  y `dias_restantes` calculados con julianday

#### Scenario: vista_dashboard_resumen agrega datos del mes
- GIVEN registros en expedientes, intimaciones, infracciones, reclamos, relevamientos
- WHEN se consulta la vista
- THEN retorna conteos del mes actual usando `strftime('%m'/'%Y', date('now','localtime'))`
