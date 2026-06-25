// scripts/fix_fecha_subsanacion.js
// Corrige los valores numéricos (timestamps JS) en fecha_subsanacion
// convirtiéndolos a formato YYYY-MM-DD

const db = require('../config/database');

async function fix() {
  console.log('Buscando registros con fecha_subsanacion numérica...');

  const [rows] = await db.pool.execute(
    "SELECT id, fecha_subsanacion FROM intimaciones WHERE fecha_subsanacion IS NOT NULL AND fecha_subsanacion != ''"
  );

  var fixed = 0;

  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    var val = String(row.fecha_subsanacion);

    // Solo corregir si es un timestamp numérico (10+ dígitos)
    if (/^\d{10,}/.test(val)) {
      var d = new Date(Number(val));
      var yyyy = d.getFullYear();
      var mm = String(d.getMonth() + 1).padStart(2, '0');
      var dd = String(d.getDate()).padStart(2, '0');
      var fechaCorrecta = yyyy + '-' + mm + '-' + dd;

      await db.pool.execute(
        'UPDATE intimaciones SET fecha_subsanacion = ? WHERE id = ?',
        [fechaCorrecta, row.id]
      );

      console.log('  ID ' + row.id + ': ' + val + ' -> ' + fechaCorrecta);
      fixed++;
    }
  }

  console.log('\nCorregidos: ' + fixed + ' registros');
  process.exit(0);
}

fix().catch(function(err) {
  console.error('Error:', err);
  process.exit(1);
});
