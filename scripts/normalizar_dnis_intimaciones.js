// scripts/normalizar_dnis_intimaciones.js
// Migración única: limpia separadores (puntos, espacios, guiones) de los DNIs de intimaciones
// Reutiliza la misma lógica que el backend (utils/normalizarTexto.js)
// Uso: node scripts/normalizar_dnis_intimaciones.js

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { normalizarDni } = require('../utils/normalizarTexto');

const dbPath = path.join(__dirname, '..', 'database', 'gestion_municipal.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) { console.error('Error abriendo DB:', err.message); process.exit(1); }
});

db.all('SELECT id, dni FROM intimaciones', (err, filas) => {
  if (err) { console.error('Error leyendo intimaciones:', err.message); process.exit(1); }

  let modificadas = 0;
  let errores = 0;
  const ejemplos = [];

  filas.forEach((fila) => {
    const nuevo = normalizarDni(fila.dni);
    if (fila.dni === nuevo) return;

    modificadas++;
    if (ejemplos.length < 10) {
      ejemplos.push({ id: fila.id, antes: fila.dni, despues: nuevo });
    }

    db.run('UPDATE intimaciones SET dni = ? WHERE id = ?', [nuevo, fila.id], (updErr) => {
      if (updErr) {
        errores++;
        console.error(`Error actualizando id ${fila.id}:`, updErr.message);
      }
    });
  });

  db.all('SELECT 1', () => {
    console.log(`Total intimaciones: ${filas.length}`);
    console.log(`Filas modificadas: ${modificadas}`);
    if (errores > 0) console.log(`Errores: ${errores}`);
    if (ejemplos.length > 0) {
      console.log('\nEjemplos antes -> después:');
      ejemplos.forEach((e) => console.log(`  id ${e.id}: "${e.antes}" -> "${e.despues}"`));
    } else {
      console.log('Ninguna fila requería limpieza de DNI.');
    }
    db.close();
  });
});
