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

/**
 * Normaliza una dirección exclusivamente para propósitos de comparación y
 * agrupamiento (NO para presentación). Minúsculas, sin acentos, signos de
 * puntuación por espacios, unifica abreviaturas comunes y colapsa espacios.
 * @param {string} val
 * @returns {string}
 */
function normalizarDireccionParaGrupo(val) {
  if (typeof val !== 'string') return '';
  return val.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[.,\-\/\\#]/g, ' ')
    .replace(/\b(av|avda|avenida)\b/g, 'av')
    .replace(/\b(pso|piso|depto|dpto)\b/g, '')
    .replace(/\s+/g, ' ').trim();
}

/**
 * Normaliza un nombre para comparación/agrupamiento (NO para presentación).
 * Minúsculas, sin acentos; conserva solo letras y espacios.
 * @param {string} val
 * @returns {string}
 */
function normalizarNombreParaGrupo(val) {
  if (typeof val !== 'string') return '';
  return val.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

module.exports = { titleCase, fraseCase, upper, normalizarDni, normalizarObstruccion, normalizarDireccionParaGrupo, normalizarNombreParaGrupo };
