const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, '..', 'database', 'gestion_municipal.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) { console.error('Error abriendo DB:', err.message); process.exit(1); }
});

const rubros = [
  ['rubro_comercial', 'panaderia', 'Panadería', 1, 1],
  ['rubro_comercial', 'carniceria', 'Carnicería', 2, 1],
  ['rubro_comercial', 'kiosco', 'Kiosco', 3, 1],
  ['rubro_comercial', 'despensa', 'Despensa', 4, 1],
  ['rubro_comercial', 'verduleria', 'Verdulería', 5, 1],
  ['rubro_comercial', 'farmacia', 'Farmacia', 6, 1],
  ['rubro_comercial', 'boutique', 'Boutique', 7, 1],
  ['rubro_comercial', 'peluqueria', 'Peluquería', 8, 1],
  ['rubro_comercial', 'ferreteria', 'Ferretería', 9, 1],
  ['rubro_comercial', 'gastronomia', 'Gastronomía', 10, 1],
  ['rubro_comercial', 'bar', 'Bar', 11, 1],
  ['rubro_comercial', 'autoservicio', 'Autoservicio', 12, 1],
  ['rubro_comercial', 'otro', 'Otro', 99, 1],
];

const stmt = db.prepare('INSERT OR IGNORE INTO catalogos (categoria, valor, label, orden, activo) VALUES (?, ?, ?, ?, ?)');

let done = 0;
rubros.forEach(([categoria, valor, label, orden, activo]) => {
  stmt.run(categoria, valor, label, orden, activo, (err) => {
    if (err) console.error('Error insertando:', valor, err.message);
    done++;
    if (done === rubros.length) {
      stmt.finalize();
      console.log('Rubros comerciales sembrados correctamente');
      db.close();
    }
  });
});
