// scripts/normalizar_intimaciones.js
// Migración única: normaliza mayúsculas/minúsculas de los campos de texto de intimaciones
// Reutiliza la misma lógica que el backend (utils/normalizarTexto.js)
// Uso: node scripts/normalizar_intimaciones.js

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { titleCase, upper, normalizarObstruccion } = require('../utils/normalizarTexto');

const dbPath = path.join(__dirname, '..', 'database', 'gestion_municipal.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) { console.error('Error abriendo DB:', err.message); process.exit(1); }
});

const CAMPOS = {
  nombre_apellido: titleCase,
  direccion: titleCase,
  tipo_obstruccion: normalizarObstruccion,
  marca: titleCase,
  modelo: titleCase,
  color: titleCase,
  lugar_deposito: titleCase,
  dominio: upper
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

db.all(`SELECT id, ${camposSelect} FROM intimaciones`, (err, filas) => {
  if (err) { console.error('Error leyendo intimaciones:', err.message); process.exit(1); }

  let modificadas = 0;
  let errores = 0;
  const ejemplos = [];

  filas.forEach((fila) => {
    const cambios = normalizarFila(fila);
    if (Object.keys(cambios).length === 0) return;

    modificadas++;
    if (ejemplos.length < 5) {
      const antes = { nombre_apellido: fila.nombre_apellido, direccion: fila.direccion, dominio: fila.dominio, tipo_obstruccion: fila.tipo_obstruccion };
      ejemplos.push({ id: fila.id, antes, cambios });
    }

    const sets = Object.keys(cambios).map((c) => `${c} = ?`).join(', ');
    const valores = Object.values(cambios).map((v) => (v === undefined || v === null ? null : v));
    db.run(`UPDATE intimaciones SET ${sets} WHERE id = ?`, [...valores, fila.id], (updErr) => {
      if (updErr) {
        errores++;
        console.error(`Error actualizando id ${fila.id}:`, updErr.message);
      }
    });
  });

  // Esperar a que terminen los UPDATE antes de cerrar
  db.all('SELECT 1', () => {
    console.log(`Total intimaciones: ${filas.length}`);
    console.log(`Filas modificadas: ${modificadas}`);
    if (errores > 0) console.log(`Errores: ${errores}`);
    if (ejemplos.length > 0) {
      console.log('\nEjemplos antes -> después:');
      ejemplos.forEach((e) => {
        console.log(`  id ${e.id}:`);
        for (const [campo, nuevo] of Object.entries(e.cambios)) {
          console.log(`    ${campo}: "${e.antes[campo] || ''}" -> "${nuevo}"`);
        }
      });
    } else {
      console.log('Ninguna fila requería normalización.');
    }
    db.close();
  });
});
