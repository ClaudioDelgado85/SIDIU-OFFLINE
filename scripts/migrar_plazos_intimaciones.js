// scripts/migrar_plazos_intimaciones.js
// Migración estructural idempotente del historial de plazos (plazos_intimacion).
//
// Qué hace:
//   1. Backup de database/gestion_municipal.db → .db.bak-pre-plazos-{timestamp}
//      (aborta sin tocar la BD si el backup falla).
//   2. Aplica CREATE TABLE IF NOT EXISTS plazos_intimacion y
//      CREATE INDEX IF NOT EXISTS idx_plazos_intimacion_intimacion_id.
//   3. NO inserta filas: el historial arranca vacío (los plazos históricos
//      documentados en observaciones NO se migran — decisión de alcance R8).
//   4. Imprime reporte. Segunda ejecución → "ya aplicado" (idempotente).
//
// Uso: node scripts/migrar_plazos_intimaciones.js

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '..', 'database', 'gestion_municipal.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) { console.error('Error abriendo DB:', err.message); process.exit(1); }
});

const all = (sql, params = []) => new Promise((resolve, reject) => {
  db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
});

const run = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function (err) {
    if (err) reject(err);
    else resolve({ lastID: this.lastID, changes: this.changes });
  });
});

// ── 1. Backup previo ──
function hacerBackup() {
  if (!fs.existsSync(dbPath)) return null;
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupPath = `${dbPath}.bak-pre-plazos-${ts}`;
  fs.copyFileSync(dbPath, backupPath); // lanza excepción si falla → aborta
  return backupPath;
}

// ── 2. Aplicar migración (idempotente) ──
async function aplicarMigracion() {
  const tablas = await all(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'plazos_intimacion'"
  );
  if (tablas.length === 0) {
    await run(`
      CREATE TABLE IF NOT EXISTS plazos_intimacion (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        intimacion_id INTEGER NOT NULL,
        fecha_otorgamiento TEXT NOT NULL,
        dias INTEGER NOT NULL CHECK (dias > 0),
        motivo TEXT,
        usuario TEXT,
        fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (intimacion_id) REFERENCES intimaciones(id) ON DELETE CASCADE
      )
    `);
    console.log('✔ Tabla plazos_intimacion creada.');
  } else {
    console.log('= Tabla plazos_intimacion ya existe; se omite CREATE.');
  }
  await run('CREATE INDEX IF NOT EXISTS idx_plazos_intimacion_intimacion_id ON plazos_intimacion(intimacion_id)');
  console.log('✔ Índice idx_plazos_intimacion_intimacion_id garantizado.');
}

// ── Main ──
async function main() {
  console.log('=== MIGRACIÓN DE PLAZOS DE INTIMACIONES ===');

  // 1. Backup
  let backupPath = null;
  try {
    backupPath = hacerBackup();
  } catch (e) {
    console.error('✗ Error al crear el backup. Abortando (no se toca la BD):', e.message);
    db.close();
    process.exit(1);
  }
  if (backupPath) console.log(`✔ Backup creado: ${backupPath}`);
  else console.log('= No se encontró archivo DB; solo se aplicará el esquema.');

  // 2. Migración estructural
  await aplicarMigracion();

  // 3. Reporte (sin migración de datos: R8 — el historial arranca vacío)
  const [conteo] = await all('SELECT COUNT(*) AS c FROM plazos_intimacion');

  console.log('\n=== REPORTE ===');
  console.log(`Filas en plazos_intimacion: ${conteo.c} (debe ser 0 — sin migración de históricos)`);
  console.log('Plazos históricos en observaciones: NO migrados (decisión de alcance).');
  console.log('Listo. Segunda ejecución: "ya aplicado" sin cambios.');

  db.close();
}

main().catch((err) => {
  console.error('✗ Error durante la migración:', err.message);
  db.close();
  process.exit(1);
});