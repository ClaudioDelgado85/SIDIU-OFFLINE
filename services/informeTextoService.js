// services/informeTextoService.js
// Fuente única de redacción narrativa del Informe Diario.
// Autores TODO el texto formal (preview, PDF y Word); consumidores solo renderizan.
// Funciones puras CommonJS: sin acceso a base de datos.

// Título literal del documento (sin tilde, según spec/product decisions).
const TITULO_INFORME = 'Informe Diario de Gestion';

// Bloque de firma fijo: el documento se imprime y firma a mano.
const FIRMA = Object.freeze({
  linea: '________________________',
  aclaracion: 'Firma y aclaración',
  cargo: 'Dirección de Inspección Urbana',
  lugarFecha: 'Lugar y fecha',
});

// Cierre formal del informe (texto simplificado según pilot feedback).
const CIERRE =
  'Sin otro particular, se eleva el presente informe para su consideración y fines que estime corresponder.';

// Etiquetas legibles de estado de expediente (mismos textos que docxService).
const ETIQUETAS_ESTADO_EXPEDIENTE = {
  ingreso: 'Ingresó',
  en_inspeccion: 'En inspección',
  plazo_otorgado: 'Plazo otorgado',
  salida: 'Dio salida',
};

// Definición de los 8 módulos del informe, en orden de presentación.
// `clave` = valores de los checkboxes del filtro; `propiedad` = clave del array crudo en el payload.
const MODULOS = [
  {
    clave: 'tareas', propiedad: 'tareas', titulo: 'Tareas y Operativos',
    singular: 'tarea', plural: 'tareas', etiqueta: 'Tareas',
    participioSingular: 'registrada', participioPlural: 'registradas',
    textoVacio: 'No se registraron tareas ni operativos durante la jornada.',
  },
  {
    clave: 'expedientes', propiedad: 'expedientes', titulo: 'Movimientos de Expedientes',
    singular: 'expediente', plural: 'expedientes', etiqueta: 'Expedientes',
    participioSingular: 'registrado', participioPlural: 'registrados',
    textoVacio: 'No se registraron movimientos de expedientes durante la jornada.',
  },
  {
    clave: 'intimaciones', propiedad: 'intimaciones', titulo: 'Intimaciones Realizadas',
    singular: 'intimación', plural: 'intimaciones', etiqueta: 'Intimaciones',
    participioSingular: 'registrada', participioPlural: 'registradas',
    textoVacio: 'No se realizaron intimaciones durante la jornada.',
  },
  {
    clave: 'actas', propiedad: 'infracciones', titulo: 'Actas de Infracción',
    singular: 'acta de infracción', plural: 'actas de infracción', etiqueta: 'Actas de Infracción',
    participioSingular: 'registrada', participioPlural: 'registradas',
    textoVacio: 'No se labraron actas de infracción durante la jornada.',
  },
  {
    clave: 'reclamos', propiedad: 'reclamos', titulo: 'Reclamos Recibidos',
    singular: 'reclamo', plural: 'reclamos', etiqueta: 'Reclamos',
    participioSingular: 'registrado', participioPlural: 'registrados',
    textoVacio: 'No se recibieron reclamos durante la jornada.',
  },
  {
    clave: 'relevamientos', propiedad: 'relevamientos', titulo: 'Relevamientos Ejecutados',
    singular: 'relevamiento', plural: 'relevamientos', etiqueta: 'Relevamientos',
    participioSingular: 'registrado', participioPlural: 'registrados',
    textoVacio: 'No se efectuaron relevamientos durante la jornada.',
  },
  {
    clave: 'comercios', propiedad: 'comercios', titulo: 'Comercios Relevados',
    singular: 'comercio', plural: 'comercios', etiqueta: 'Comercios Relevados',
    participioSingular: 'registrado', participioPlural: 'registrados',
    textoVacio: 'No se relevaron comercios durante la jornada.',
  },
  {
    clave: 'vendedores', propiedad: 'vendedores', titulo: 'Vendedores Ambulantes',
    singular: 'vendedor ambulante', plural: 'vendedores ambulantes', etiqueta: 'Vendedores Ambulantes',
    participioSingular: 'registrado', participioPlural: 'registrados',
    textoVacio: 'No se relevaron vendedores ambulantes durante la jornada.',
  },
];

/**
 * Normaliza un valor libre de texto: null, undefined, vacío, guion solitario o los
 * literales "undefined"/"null" se sustituyen por el defecto semántico indicado.
 */
function texto(valor, defecto) {
  if (valor === null || valor === undefined) return defecto;
  if (typeof valor !== 'string') return String(valor);
  const limpio = valor.trim();
  if (!limpio || limpio === '-' || /^(undefined|null)$/i.test(limpio)) return defecto;
  return limpio;
}

/** Singular cuando la cantidad es 1, plural en cualquier otro caso. */
function pluralizar(cantidad, singular, plural) {
  return Number(cantidad) === 1 ? singular : plural;
}

/** Convierte una fecha 'YYYY-MM-DD' en 'DD/MM/YYYY'; otros formatos pasan intactos. */
function formatearFechaInforme(fecha) {
  if (fecha === null || fecha === undefined || fecha === '') return '';
  const cruda = String(fecha).trim();
  const coincidencia = cruda.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!coincidencia) return cruda;
  return `${coincidencia[3]}/${coincidencia[2]}/${coincidencia[1]}`;
}

/** Suma totalSeccion de todas las secciones; acepta números sueltos u objetos sección. */
function calcularTotalGeneral(secciones) {
  const lista = Array.isArray(secciones) ? secciones : [];
  return lista.reduce((suma, elemento) => {
    if (elemento === null || elemento === undefined) return suma;
    if (typeof elemento === 'number') return suma + elemento;
    const total = elemento.totalSeccion;
    return suma + (typeof total === 'number' ? total : 0);
  }, 0);
}

/** Garantiza que la oración termine en un único punto final. */
function cerrarOracion(oracion) {
  return `${String(oracion).replace(/[.\s]+$/, '')}.`;
}

/** Ubicación compuesta: dirección preferente, si no barrio; nunca vacía. */
function ubicacionCompuesta(registro, campoDireccion) {
  return texto(registro[campoDireccion], '') ||
    texto(registro.barrio_nombre, 'ubicación no registrada');
}

// ── Constructores de oraciones (UNA oración formal por registro) ──────────

function crearTextoTarea(registro) {
  const t = registro || {};
  const titulo = texto(t.titulo, 'tarea sin título');
  const categoria = texto(t.categoria_nombre, 'general');
  const detalle = texto(t.descripcion, 'sin mayor detalle');
  const ubicacion = ubicacionCompuesta(t, 'direccion');
  return cerrarOracion(
    `Se ejecutó la tarea "${titulo}" (categoría: ${categoria}) en ${ubicacion}; ${detalle}`
  );
}

function crearTextoExpediente(registro) {
  const e = registro || {};
  const numero = texto(e.numero_expediente, 'sin número');
  const contribuyente = texto(e.nombre_apellido, 'No identificado');
  const motivo = texto(e.motivo, 'sin mayor detalle');
  const estado = ETIQUETAS_ESTADO_EXPEDIENTE[e.estado] || texto(e.estado, 'sin especificar');
  const ubicacion = ubicacionCompuesta(e, 'direccion');
  return cerrarOracion(
    `Se gestionó el expediente N° ${numero}, caratulado a nombre de ${contribuyente}, ` +
    `por motivo "${motivo}", con ubicación en ${ubicacion}, cuyo estado actual es ${estado}`
  );
}

function crearTextoIntimacion(registro) {
  const i = registro || {};
  const numero = texto(i.numero_intimacion, 'sin número');
  const contribuyente = texto(i.nombre_apellido, 'No identificado');
  const domicilio = texto(i.direccion, 'ubicación no registrada');
  const tipo = texto(i.tipo_obstruccion_label, '') ||
    texto(i.tipo_label, '') || texto(i.tipo, 'trámite no especificado');
  const rubro = texto(i.rubro_comercial_label, 'no especificado');
  const dias = Number(i.plazo_dias) > 0 ? Number(i.plazo_dias) : 0;
  const plazo = dias > 0
    ? `${dias} ${pluralizar(dias, 'día', 'días')}`
    : 'cumplimiento inmediato';
  return cerrarOracion(
    `Se diligenció la intimación N° ${numero}, dirigida a ${contribuyente}, ` +
    `con domicilio en ${domicilio}, referida a ${tipo} (rubro: ${rubro}), ` +
    `otorgándose un plazo de ${plazo}`
  );
}

function crearTextoInfraccion(registro) {
  const inf = registro || {};
  const acta = texto(inf.numero_acta, 'sin número');
  const infractor = texto(inf.nombre_apellido, 'No identificado');
  const ubicacion = texto(inf.direccion, 'ubicación no registrada');
  const motivo = texto(inf.motivo_infraccion, 'sin mayor detalle');
  let oracion = `Se labró el acta de infracción N° ${acta} a ${infractor}, ` +
    `en ${ubicacion}, por ${motivo}`;
  const observaciones = texto(inf.observaciones, '');
  if (observaciones) oracion += `; observaciones: ${observaciones}`;
  return cerrarOracion(oracion);
}

function crearTextoReclamo(registro) {
  const r = registro || {};
  const numero = texto(r.numero_reclamo, 'sin número');
  const tipo = texto(r.tipo_reclamo, 'no especificado');
  const lugar = texto(r.direccion_incidente, 'ubicación no registrada');
  const detalle = texto(r.descripcion, 'sin mayor detalle');
  return cerrarOracion(
    `Se recibió el reclamo N° ${numero}, correspondiente al tipo "${tipo}", ` +
    `con ubicación en ${lugar}; ${detalle}`
  );
}

function crearTextoRelevamiento(registro) {
  const rel = registro || {};
  const numero = texto(rel.numero_relevamiento, 'sin número');
  const tipo = texto(rel.tipo_relevamiento, 'no especificado');
  const ubicacion = texto(rel.ubicacion, 'ubicación no registrada');
  const responsable = texto(rel.responsable_nombre, 'No identificado');
  let oracion = `Se efectuó el relevamiento N° ${numero}, del tipo "${tipo}", ` +
    `en ${ubicacion}, bajo responsabilidad de ${responsable}`;
  const observaciones = texto(rel.observaciones, '');
  if (observaciones) oracion += `; observaciones: ${observaciones}`;
  return cerrarOracion(oracion);
}

function crearTextoComercio(registro) {
  const c = registro || {};
  const propietario = texto(c.nombre_propietario, 'No identificado');
  const direccion = texto(c.direccion_comercial, 'ubicación no registrada');
  const rubro = texto(c.rubro, 'no especificado');
  const habilitacion = c.esta_habilitado
    ? 'se encuentra habilitado'
    : 'no se encuentra habilitado';
  return cerrarOracion(
    `Se relevó el comercio sito en ${direccion}, perteneciente a ${propietario}, ` +
    `con rubro ${rubro}, el cual ${habilitacion}`
  );
}

function crearTextoVendedor(registro) {
  const v = registro || {};
  const nombre = texto(v.nombre_vendedor, 'No identificado');
  const ubicacion = texto(v.ubicacion, 'ubicación no registrada');
  const rubro = texto(v.rubro, 'no especificado');
  const autorizacion = v.tiene_autorizacion
    ? 'cuenta con autorización vigente'
    : 'no cuenta con autorización registrada';
  return cerrarOracion(
    `Se relevó al vendedor ambulante ${nombre}, ubicado en ${ubicacion}, ` +
    `dedicado a la venta de rubro ${rubro}, quien ${autorizacion}`
  );
}

const CONSTRUCTORES_ITEMS = {
  tareas: crearTextoTarea,
  expedientes: crearTextoExpediente,
  intimaciones: crearTextoIntimacion,
  actas: crearTextoInfraccion,
  reclamos: crearTextoReclamo,
  relevamientos: crearTextoRelevamiento,
  comercios: crearTextoComercio,
  vendedores: crearTextoVendedor,
};

// ── Composición ───────────────────────────────────────────────────────────

/** Arma una sección narrativa a partir de la definición de módulo y sus registros crudos. */
function armarSeccion(definicion, registros) {
  const lista = Array.isArray(registros) ? registros : [];
  const totalSeccion = lista.length;
  const parrafoResumen = totalSeccion > 0
    ? `Se consigna un total de ${totalSeccion} ${pluralizar(totalSeccion, definicion.singular, definicion.plural)} ${pluralizar(totalSeccion, definicion.participioSingular, definicion.participioPlural)} durante la jornada.`
    : `No se registraron ${definicion.plural} durante la jornada.`;
  const construir = CONSTRUCTORES_ITEMS[definicion.clave];
  return {
    clave: definicion.clave,
    titulo: definicion.titulo,
    parrafoResumen,
    items: lista.map((registro) => construir(registro)),
    totalSeccion,
    textoVacio: definicion.textoVacio,
  };
}

/** Párrafo introductorio del informe a partir del payload crudo. */
function crearResumenIntroductorio(data) {
  const d = data || {};
  const fechaFormateada = formatearFechaInforme(d.fecha);
  const totalGeneral = MODULOS.reduce(
    (suma, modulo) => suma + (Array.isArray(d[modulo.propiedad]) ? d[modulo.propiedad].length : 0),
    0
  );
  return `En el día de la fecha ${fechaFormateada}, la Dirección de Inspección Urbana de la ` +
    `Municipalidad de Clorinda desarrolla sus tareas habituales de inspección y fiscalización, ` +
    `registrando un total de ${totalGeneral} ${pluralizar(totalGeneral, 'gestión', 'gestiones')} ` +
    `que se ${pluralizar(totalGeneral, 'detalla', 'detallan')} en los siguientes módulos: tareas y operativos, movimientos de expedientes, ` +
    `intimaciones, actas de infracción, reclamos, relevamientos, comercios relevados y vendedores ambulantes.`;
}

/**
 * Redacta la estructura narrativa completa del informe diario.
 * @param {object} data Payload crudo del informeDiario: { fecha, tareas, expedientes,
 *   intimaciones, infracciones, reclamos, relevamientos, comercios, vendedores }.
 * @returns Estructura { fechaFormateada, introduccion, lineasResumen, fraseTotalGeneral,
 *   totalGeneral, secciones, cierre, firma }.
 */
function crearSeccionesNarrativas(data) {
  const d = data || {};
  const secciones = MODULOS.map((definicion) => armarSeccion(definicion, d[definicion.propiedad]));
  const totalGeneral = calcularTotalGeneral(secciones);
  // Pilot feedback: el resumen ejecutivo solo lista módulos CON registros;
  // totalGeneral sigue sumando las 8 secciones (R6 intacto).
  const lineasResumen = secciones
    .map((seccion, indice) => ({
      etiqueta: MODULOS[indice].etiqueta,
      cantidad: seccion.totalSeccion,
    }))
    .filter((linea) => linea.cantidad > 0);
  return {
    fechaFormateada: formatearFechaInforme(d.fecha),
    introduccion: crearResumenIntroductorio(d),
    lineasResumen,
    fraseTotalGeneral: `Total general de gestiones: ${totalGeneral}`,
    totalGeneral,
    secciones,
    cierre: CIERRE,
    firma: { ...FIRMA },
  };
}

module.exports = {
  pluralizar,
  formatearFechaInforme,
  texto,
  calcularTotalGeneral,
  crearResumenIntroductorio,
  crearTextoTarea,
  crearTextoExpediente,
  crearTextoIntimacion,
  crearTextoInfraccion,
  crearTextoReclamo,
  crearTextoRelevamiento,
  crearTextoComercio,
  crearTextoVendedor,
  crearSeccionesNarrativas,
  TITULO_INFORME,
};
