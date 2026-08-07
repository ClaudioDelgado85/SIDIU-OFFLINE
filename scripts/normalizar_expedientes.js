// scripts/normalizar_expedientes.js
// Migración única: normaliza mayúsculas/minúsculas y DNIs de los expedientes
// Reutiliza la misma lógica que el backend (utils/normalizarTexto.js)
// Uso: node scripts/normalizar_expedientes.js

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { titleCase, upper, normalizarDni, normalizarObstruccion } = require('../utils/normalizarTexto');

const dbPath = path.join(__dirname, '..', 'database', 'gestion_municipal.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) { console.error('Error abriendo DB:', err.message); process.exit(1); }
});

const CAMPOS = {
  numero_expediente: upper,
  nombre_apellido: titleCase,
  dni: normalizarDni,
  motivo: normalizarObstruccion,
  direccion: titleCase
};

function normalizarFila(fila) {
  const cambios = {};
  for (const [campo, fn] of Object.entries(CAMPOS)) {
    const nuevo = fn(fila[campo]);
    if (fila[campo] !== nuevo) cambios[campo] = nuevo;
  }
  if (typeof fila.observaciones === 'string') {
    const nuevo = fila.observaciones.replace(/\s+/g, ' ').trim();
    if (fila.observaciones !== nuevo) cambios.observaciones = nuevo;
  }
  return cambios;
}

const camposSelect = Object.keys(CAMPOS).concat('observaciones').join(', ');

db.all(`SELECT id, ${camposSelect} FROM expedientes`, (err, filas) => {
  if (err) { console.error('Error leyendo expedientes:', err.message); process.exit(1); }

  let modificadas = 0;
  let errores = 0;
  const ejemplos = [];

  filas.forEach((fila) => {
    const cambios = normalizarFila(fila);
    if (Object.keys(cambios).length === 0) return;

    modificadas++;
    if (ejemplos.length < 8) {
      ejemplos.push({ id: fila.id, cambios });
    }

    const sets = Object.keys(cambios).map((c) => `${c} = ?`).join(', ');
    const valores = Object.values(cambios).map((v) => (v === undefined || v === null ? null : v));
    db.run(`UPDATE expedientes SET ${sets} WHERE id = ?`, [...valores, fila.id], (updErr) => {
      if (updErr) {
        errores++;
        console.error(`Error actualizando id ${fila.id}:`, updErr.message);
      }
    });
  });

  db.all('SELECT 1', () => {
    console.log(`Total expedientes: ${filas.length}`);
    console.log(`Filas modificadas: ${modificadas}`);
    if (errores > 0) console.log(`Errores: ${errores}`);
    if (ejemplos.length > 0) {
      console.log('\nEjemplos id -> cambios:');
      ejemplos.forEach((e) => {
        console.log(`  id ${e.id}:`);
        for (const [campo, nuevo] of Object.entries(e.cambios)) {
          console.log(`    ${campo} -> "${nuevo}"`);
        }
      });
    } else {
      console.log('Ninguna fila requería normalización.');
    }
    db.close();
  });
});
