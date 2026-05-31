# database-setup-script Specification

## Purpose
Script Node.js reproducible que inicializa la base de datos SQLite desde cero: aplica el schema
y siembra datos estructurales mínimos.

## Requirements

### Requirement: Setup Reproducible
El script MUST respaldar y eliminar la DB preexistente antes de crear una nueva.

#### Scenario: Primera ejecución (sin DB previa)
- GIVEN no existe `database/gestion_municipal.db`
- WHEN se ejecuta `node scripts/setup_sqlite.js`
- THEN crea el archivo DB, aplica el schema completo y siembra seeds sin error

#### Scenario: Re-ejecución (DB existente)
- GIVEN ya existe `database/gestion_municipal.db`
- WHEN se ejecuta el script nuevamente
- THEN respalda el archivo como `.db.bak-{timestamp}` antes de recrear

### Requirement: Seeds Mínimos
El script MUST sembrar los 10 barrios iniciales y el usuario administrador.

#### Scenario: Admin creado con credenciales correctas
- GIVEN el script completa sin error
- WHEN se hace POST /api/auth/login con `{ usuario: 'admin', password: 'admin123' }`
- THEN el servidor responde con un JWT válido y status 200

#### Scenario: Barrios sembrados
- GIVEN el script completa sin error
- WHEN se consulta GET /api/barrios
- THEN retorna los 10 barrios definidos (Centro, Porteño Norte, etc.) con activo=1
