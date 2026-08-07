// utils/normalizarTexto.js
// Utilidades de normalización de texto para campos ingresados por operadores

function titleCase(val) {
  if (typeof val !== 'string') return val;
  const limpio = val.replace(/\s+/g, ' ').trim();
  if (!limpio) return limpio;
  return limpio
    .toLowerCase()
    .replace(/(^|\s)(\p{L})/gu, (match, espacio, letra) => espacio + letra.toUpperCase());
}

function upper(val) {
  if (typeof val !== 'string') return val;
  return val.replace(/\s+/g, ' ').trim().toUpperCase();
}

function normalizarDni(val) {
  if (typeof val !== 'string') return val;
  return val.replace(/[\s.\-]/g, '');
}

function fraseCase(val) {
  if (typeof val !== 'string') return val;
  const limpio = val.replace(/\s+/g, ' ').trim();
  if (!limpio) return limpio;
  return limpio.charAt(0).toUpperCase() + limpio.slice(1).toLowerCase();
}

function normalizarObstruccion(val) {
  if (typeof val !== 'string') return val;
  const limpio = val.replace(/\s+/g, ' ').trim();
  if (!limpio) return limpio;
  const match = limpio.match(/^otros\s*:\s*(.*)$/i);
  if (match && match[1]) {
    return `Otros: ${fraseCase(match[1])}`;
  }
  return limpio;
}

module.exports = { titleCase, fraseCase, upper, normalizarDni, normalizarObstruccion };
