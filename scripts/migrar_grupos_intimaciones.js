// scripts/migrar_grupos_intimaciones.js
// Migración + backfill idempotente de casos explícitos (grupo_id) en intimaciones.
//
// Qué hace:
//   1. Backup de database/gestion_municipal.db → .db.bak-pre-grupos-{timestamp} (aborta si falla).
//   2. Aplica ALTER TABLE (solo si la columna grupo_id no existe, guard PRAGMA table_info)
//      y CREATE INDEX IF NOT EXISTS.
//   3. Procesa SOLO filas con grupo_id NULL o '' ordenadas por fecha ASC, id ASC:
//      agrupación jerárquica (DNI+dirección normalizados → nombre+dirección normalizados
//      sin DNI → caso único si faltan ambos), grupo_id determinístico GRP-YYYYMM-NNNN,
//      numero_intimacion correlativo por fecha dentro del grupo.
//   4. Marca 'reiterada' las instancias previas no cumplidas ni infraccionadas.
//   5. Imprime reporte. Segunda ejecución → "0 pendientes" (idempotente).
//
// Uso: node scripts/migrar_grupos_intimaciones.js

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { normalizarDni, normalizarDireccionParaGrupo, normalizarNombreParaGrupo } = require('../utils/normalizarTexto');

const dbPath = process.env.SQLITE_DB_PATH || path.join(__dirname, '..', 'database', 'gestion_municipal.db');

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
  const backupPath = `${dbPath}.bak-pre-grupos-${ts}`;
  fs.copyFileSync(dbPath, backupPath); // lanza excepción si falla → aborta
  return backupPath;
}

// ── 2. Aplicar migración (idempotente) ──
async function aplicarMigracion() {
  const cols = await all('PRAGMA table_info(intimaciones)');
  const tieneGrupo = cols.some((c) => c.name === 'grupo_id');
  if (!tieneGrupo) {
    await run('ALTER TABLE intimaciones ADD COLUMN grupo_id TEXT');
    console.log('✔ Columna grupo_id agregada.');
  } else {
    console.log('= Columna grupo_id ya existe; se omite ALTER.');
  }
  await run('CREATE INDEX IF NOT EXISTS idx_intimaciones_grupo_id ON intimaciones(grupo_id)');
  console.log('✔ Índice idx_intimaciones_grupo_id garantizado.');
}

// ── Clave jerárquica de agrupamiento ──
// Con DNI → dni|dirección normalizada. Sin DNI con dirección → nombre|dirección
// normalizada. Sin DNI ni dirección → null (caso único, nunca se adosa).
function claveDeGrupo(fila) {
  const dniNorm = normalizarDni(fila.dni || '');
  const dirNorm = normalizarDireccionParaGrupo(fila.direccion);
  if (dniNorm) return `dni|${dniNorm}|${dirNorm}`;
  if (dirNorm) return `nombre|${normalizarNombreParaGrupo(fila.nombre_apellido)}|${dirNorm}`;
  return null;
}

function yyyymmDeFecha(fecha) {
  const f = String(fecha || '');
  const m = f.match(/^(\d{4})-(\d{2})/);
  if (m) return m[1] + m[2];
  const d = new Date(f);
  if (!isNaN(d.getTime())) {
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
  return '000000';
}

// ── Main ──
async function main() {
  console.log('=== MIGRACIÓN DE GRUPOS DE INTIMACIONES ===');

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

  // 3. Filas pendientes (solo grupo_id NULL/vacío; las ya asignadas se preservan)
  const filas = await all(
    "SELECT * FROM intimaciones WHERE grupo_id IS NULL OR grupo_id = '' ORDER BY fecha ASC, id ASC"
  );

  if (filas.length === 0) {
    console.log('\nYa migrado (0 pendientes). Nada que hacer.');
    db.close();
    return;
  }

  console.log(`\nFilas pendientes de migrar: ${filas.length}`);

  const grupos = new Map();          // clave jerárquica -> { grupoId, contador }
  const todosLosGrupos = new Set();  // grupoIds asignados (para reporte y guard de colisión)
  let seq = 1;
  let reintentosColision = 0;
  let actualizados = 0;
  const cadenas = [];                // { grupoId, total } con total > 1

  const existeGrupo = async (gid) => {
    const rows = await all('SELECT 1 AS x FROM intimaciones WHERE grupo_id = ? LIMIT 1', [gid]);
    return rows.length > 0;
  };

  const nuevoGrupoId = async (fecha) => {
    const yyyymm = yyyymmDeFecha(fecha);
    let gid;
    do {
      gid = `GRP-${yyyymm}-${String(seq).padStart(4, '0')}`;
      seq++;
      if (await existeGrupo(gid)) { reintentosColision++; continue; }
      break;
    } while (true);
    return gid;
  };

  // 4. Recorrer en orden y asignar grupo_id + numero correlativo
  for (const fila of filas) {
    const clave = claveDeGrupo(fila);
    let grupo;
    if (clave === null) {
      grupo = { grupoId: await nuevoGrupoId(fila.fecha), contador: 0 };
    } else {
      grupo = grupos.get(clave);
      if (!grupo) {
        grupo = { grupoId: await nuevoGrupoId(fila.fecha), contador: 0 };
        grupos.set(clave, grupo);
      }
    }
    grupo.contador++;
    todosLosGrupos.add(grupo.grupoId);

    await run(
      'UPDATE intimaciones SET grupo_id = ?, numero_intimacion = ? WHERE id = ?',
      [grupo.grupoId, grupo.contador, fila.id]
    );
    actualizados++;
  }

  // 5. Marcar reiteradas por grupo con más de 1 instancia.
  // Las filas vienen ordenadas por fecha ASC, id ASC; la última procesada de
  // cada grupo es la de mayor id (instancia más reciente).
  const grupoIdPorFila = [];
  for (const fila of filas) {
    const clave = claveDeGrupo(fila);
    const gid = clave === null ? null : (grupos.get(clave) || {}).grupoId || null;
    grupoIdPorFila.push({ id: fila.id, grupoId: gid });
  }
  const ultimos = new Map();
  const totales = new Map();
  for (const { id, grupoId } of grupoIdPorFila) {
    if (!grupoId) continue;
    ultimos.set(grupoId, id); // última fila procesada del grupo
    totales.set(grupoId, (totales.get(grupoId) || 0) + 1);
  }

  let marcadas = 0;
  for (const [grupoId, total] of totales) {
    if (total <= 1) continue;
    const r = await run(
      `UPDATE intimaciones SET estado = 'reiterada'
       WHERE grupo_id = ? AND id != ?
         AND estado NOT IN ('cumplida', 'reiterada', 'infraccionado')
         AND dio_cumplimiento = 0`,
      [grupoId, ultimos.get(grupoId)]
    );
    marcadas += r.changes;
    cadenas.push({ grupoId, total });
  }

  // 6. Reporte
  const restantes = await all(
    "SELECT COUNT(*) AS c FROM intimaciones WHERE grupo_id IS NULL OR grupo_id = ''"
  );
  console.log('\n=== REPORTE ===');
  console.log(`Total filas procesadas: ${actualizados}`);
  console.log(`Grupos generados: ${todosLosGrupos.size}`);
  console.log(`Cadenas de 2+ instancias reconstruidas: ${cadenas.length}`);
  cadenas.sort((a, b) => b.total - a.total).slice(0, 10).forEach((c) =>
    console.log(`   ${c.grupoId}: ${c.total} instancias`)
  );
  console.log(`Instancias previas marcadas como 'reiterada': ${marcadas}`);
  console.log(`Filas restantes sin grupo_id: ${restantes[0].c} (debe ser 0)`);
  console.log(`Reintentos de colisión de grupo_id: ${reintentosColision}`);

  db.close();
}

main().catch((err) => {
  console.error('✗ Error durante la migración:', err.message);
  db.close();
  process.exit(1);
});