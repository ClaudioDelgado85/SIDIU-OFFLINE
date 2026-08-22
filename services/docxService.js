const { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, WidthType, AlignmentType, BorderStyle } = require('docx');
const { TITULO_INFORME } = require('./informeTextoService');

const FONT = 'Calibri';
const MARGINS = { top: 1440, bottom: 1440, left: 1440, right: 1440 };

// Mismo destinatario por defecto que el input #destinatarioInforme del
// formulario (R6): una sola convención entre pantalla y Word.
const DESTINATARIO_DEFAULT = 'Al Señor Director de Inspección Urbana...';

// Membrete institucional de solo texto (sin imagen), igual al de la vista
// previa y el PDF [R7 composición formal].
const MEMBRETE = 'Dirección de Inspección Urbana — Municipalidad de Clorinda';

function cell(text, options = {}) {
  const { bold = false, shading, alignment, width, size = 20 } = options;
  const children = [];
  if (text !== null && text !== undefined) {
    children.push(new TextRun({ text: String(text), bold, font: FONT, size }));
  }
  return new TableCell({
    children: [new Paragraph({ children, alignment, spacing: { before: 40, after: 40 } })],
    width: width ? { size: width, type: WidthType.PERCENTAGE } : undefined,
    shading: shading ? { fill: shading } : undefined,
    verticalAlign: 'center',
  });
}

function row(cells, isHeader = false) {
  return new TableRow({
    children: cells.map((c, i) => cell(c, {
      bold: isHeader,
      shading: isHeader ? '1E3A5F' : undefined,
      size: isHeader ? 22 : 20,
      width: i < cells.length - 1 ? Math.floor(80 / cells.length) : undefined,
    })),
    tableHeader: isHeader,
  });
}

function sectionTitle(text) {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, font: FONT, size: 26, color: '1E3A5F' })],
    spacing: { before: 400, after: 200 },
    border: { bottom: { color: '1E3A5F', size: 6, style: BorderStyle.SINGLE, space: 4 } },
  });
}

function totalLine(label, count) {
  return new Paragraph({
    children: [
      new TextRun({ text: `${label}: `, font: FONT, size: 20, bold: true }),
      new TextRun({ text: String(count), font: FONT, size: 20 }),
    ],
    spacing: { before: 100, after: 100 },
    alignment: AlignmentType.RIGHT,
  });
}

function emptyParagraph() {
  return new Paragraph({ spacing: { before: 60, after: 60 }, children: [new TextRun({ text: '', size: 20 })] });
}

// ── Constructores narrativos (R8 paridad Word) ──────────────
// El texto llega redactado desde informeTextoService; aquí solo se le da
// forma de párrafos. TextRun escapa XML por sí solo, no se escapa a mano.

/** Párrafo de texto simple con opciones de estilo.
 * Interlineado 1,5 (line: 360) y espaciado posterior 12pt (after: 240)
 * en todo párrafo del cuerpo, según pedido del usuario. El `before`
 * puede ajustarse por llamada. */
function paragraph(text, options = {}) {
  const { bold = false, size = 20, color, alignment, spacing = {} } = options;
  return new Paragraph({
    children: [new TextRun({ text: String(text === null || text === undefined ? '' : text), bold, font: FONT, size, color })],
    alignment,
    spacing: { before: spacing.before ?? 60, after: 240, line: 360 },
  });
}

/** Ítem numerado de una sección (el ordinal lo compone el llamador). */
function numberedLine(text) {
  return new Paragraph({
    children: [new TextRun({ text: String(text), font: FONT, size: 20 })],
    spacing: { before: 40, after: 40 },
    indent: { left: 360, hanging: 360 },
    alignment: AlignmentType.JUSTIFIED,
  });
}

/** Línea de viñeta (resumen ejecutivo por módulo). */
function bulletLine(text) {
  return new Paragraph({
    children: [new TextRun({ text: `• ${text}`, font: FONT, size: 20 })],
    spacing: { before: 40, after: 40 },
    indent: { left: 360, hanging: 360 },
  });
}

/** Total de sección, reutiliza el estilo de totalLine. */
function summaryLine(label, count) {
  return totalLine(label, count);
}

/** Bloque de firma fijo centrado, desde el MISMO objeto firma del servicio [R9]. */
function firmaBlock(firma) {
  const f = firma || {};
  const centrado = (texto) => new Paragraph({
    children: [new TextRun({ text: String(texto === null || texto === undefined ? '' : texto), font: FONT, size: 20 })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 20, after: 20 },
  });
  return [
    emptyParagraph(),
    emptyParagraph(),
    centrado(f.linea),
    centrado(f.aclaracion),
    centrado(f.cargo),
    centrado(f.lugarFecha),
  ];
}

/**
 * Agrega un módulo narrativo: título → párrafo resumen → ítems numerados →
 * total de sección; módulo vacío → leyenda formal (textoVacio) manteniendo
 * la estructura del documento [R8].
 */
function addNarrativeModule(paragraphs, sec) {
  if (!sec) return;
  paragraphs.push(sectionTitle(sec.titulo));
  if (sec.totalSeccion > 0 && Array.isArray(sec.items) && sec.items.length > 0) {
    paragraphs.push(paragraph(sec.parrafoResumen, { alignment: AlignmentType.JUSTIFIED, spacing: { before: 120, after: 120 } }));
    sec.items.forEach((item, indice) => paragraphs.push(numberedLine(`${indice + 1}. ${item}`)));
    paragraphs.push(summaryLine('Total', sec.totalSeccion));
  } else {
    paragraphs.push(paragraph(sec.textoVacio, { alignment: AlignmentType.JUSTIFIED, spacing: { before: 120, after: 120 } }));
  }
  paragraphs.push(emptyParagraph());
}

// ── Documento narrativo formal (fuente única: informeTextoService) [R8] ──
// Orden de composición (R7/R6/R8/R9): membrete de solo texto → título
// literal → fecha → destinatario → introducción → resumen ejecutivo →
// 8 módulos narrativos → cierre → firma. Sin anexo fotográfico (decisión
// de piloto obs #396).
function buildNarrativeDocument(narrativa, destinatario) {
  const paragraphs = [];

  // Membrete institucional de solo texto (sin imagen)
  paragraphs.push(
    paragraph(MEMBRETE, {
      bold: true, size: 24, color: '1E3A5F',
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 60 },
    })
  );

  // Título literal provisto por el servicio (misma fuente que preview/PDF)
  paragraphs.push(
    paragraph(TITULO_INFORME, {
      bold: true, size: 28,
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 200 },
    })
  );

  // Fecha formateada DD/MM/YYYY desde la fuente narrativa
  paragraphs.push(paragraph(`Fecha: ${narrativa.fechaFormateada}`, { spacing: { before: 0, after: 60 } }));

  // Destinatario (R6): param saneado o default; mismo texto que en pantalla
  const valorDestinatario = (destinatario && String(destinatario).trim()) || DESTINATARIO_DEFAULT;
  paragraphs.push(paragraph(`Al: ${valorDestinatario}`, { spacing: { before: 0, after: 240 } }));

  // Introducción redactada por el servicio
  paragraphs.push(paragraph(narrativa.introduccion, {
    alignment: AlignmentType.JUSTIFIED,
    spacing: { before: 120, after: 120 },
  }));

  // Resumen ejecutivo: solo módulos con registros + total general (piloto)
  paragraphs.push(sectionTitle('Resumen ejecutivo'));
  (Array.isArray(narrativa.lineasResumen) ? narrativa.lineasResumen : []).forEach((linea) => {
    paragraphs.push(bulletLine(`${linea.etiqueta}: ${Number(linea.cantidad) || 0}`));
  });
  paragraphs.push(paragraph(narrativa.fraseTotalGeneral, { bold: true, spacing: { before: 120, after: 200 } }));

  // Los 8 módulos narrativos, en el orden entregado por el servicio
  (Array.isArray(narrativa.secciones) ? narrativa.secciones : []).forEach((sec) => addNarrativeModule(paragraphs, sec));

  // Cierre formal (constante CIERRE del servicio)
  paragraphs.push(paragraph(narrativa.cierre, {
    alignment: AlignmentType.JUSTIFIED,
    spacing: { before: 240, after: 120 },
  }));

  // Bloque de firma fijo desde el MISMO objeto firma que preview/PDF [R9]
  paragraphs.push(...firmaBlock(narrativa.firma));

  return new Document({
    title: `Informe Diario ${narrativa.fechaFormateada}`,
    description: 'Informe consolidado de gestión municipal',
    styles: { default: { document: { run: { font: FONT, size: 20 } } } },
    sections: [{ properties: { page: { margin: MARGINS } }, children: paragraphs }],
  });
}

// ── Generar documento Word ──────────────────────────────────
// Ruta narrativa cuando el payload trae seccionesNarrativas (D1/D3);
// el layout de tablas queda SOLO como fallback si la fuente narrativa
// está ausente (D5).
async function generarDocx(data, destinatario) {
  const narrativa = data && data.seccionesNarrativas;
  if (narrativa && Array.isArray(narrativa.secciones)) {
    return Packer.toBuffer(buildNarrativeDocument(narrativa, destinatario));
  }
  return buildLegacyDocument(data);
}

// Fallback legado (D5): layout de tablas previo a esta change, sin alterar,
// para rollback barato y verificación incremental.
async function buildLegacyDocument(data) {
  const { fecha } = data;
  const paragraphs = [];

  // Header principal
  paragraphs.push(
    new Paragraph({
      children: [new TextRun({ text: 'MUNICIPALIDAD DE CLORINDA', bold: true, font: FONT, size: 28, color: '1E3A5F' })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Dirección de Inspección Urbana', font: FONT, size: 22, color: '555555' })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'INFORME DIARIO DE GESTIÓN', bold: true, font: FONT, size: 24, color: '333333' })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [new TextRun({ text: `Fecha: ${fecha}`, font: FONT, size: 20 })],
      spacing: { after: 300 },
    })
  );

  // Helper para agregar módulo
  const addModule = (title, items, columns, mapper) => {
    if (!items || items.length === 0) return;
    paragraphs.push(sectionTitle(title));

    const headerRow = row(columns.map(c => c.label), true);
    const dataRows = items.map(item => row(columns.map(c => mapper(item, c.key))));
    paragraphs.push(new Table({ rows: [headerRow, ...dataRows] }));
    paragraphs.push(totalLine('Total', items.length));
    paragraphs.push(emptyParagraph());
  };

  addModule('Tareas y Operativos', data.tareas,
    [{ label: 'Categoría', key: 'categoria_nombre' }, { label: 'Título', key: 'titulo' }, { label: 'Descripción', key: 'descripcion' }, { label: 'Ubicación', key: (t) => t.direccion || '' }],
    (t, key) => typeof key === 'function' ? key(t) : t[key] || '-'
  );

  addModule('Movimientos de Expedientes', data.expedientes,
    [{ label: 'Número', key: 'numero_expediente' }, { label: 'Contribuyente', key: 'nombre_apellido' }, { label: 'Motivo', key: 'motivo' }, { label: 'Estado', key: (i) => {
      const estados = {
        'ingreso': 'Ingresó',
        'en_inspeccion': 'En inspección',
        'plazo_otorgado': 'Plazo otorgado',
        'salida': 'Dio salida'
      };
      return estados[i.estado] || i.estado;
    }}],
    (i, key) => typeof key === 'function' ? key(i) : i[key] || '-'
  );

  addModule('Intimaciones Realizadas', data.intimaciones,
    [{ label: 'Nro', key: 'numero_intimacion' }, { label: 'Contribuyente', key: 'nombre_apellido' }, { label: 'Dirección', key: 'direccion' }, { label: 'Tipo', key: (i) => i.tipo_obstruccion_label || i.tipo_label || i.tipo }, { label: 'Rubro', key: (i) => i.rubro_comercial_label || '-' }, { label: 'Plazo', key: (i) => i.plazo_dias > 0 ? `${i.plazo_dias} días` : 'Inmediato' }],
    (i, key) => typeof key === 'function' ? key(i) : (i[key] != null ? i[key] : '-')
  );

  addModule('Actas de Infracción', data.infracciones,
    [{ label: 'Acta', key: 'numero_acta' }, { label: 'Infractor', key: 'nombre_apellido' }, { label: 'Dirección', key: 'direccion' }, { label: 'Motivo', key: 'motivo_infraccion' }],
    (i, key) => i[key] || '-'
  );

  addModule('Reclamos Recibidos', data.reclamos,
    [{ label: 'Reclamo', key: 'numero_reclamo' }, { label: 'Tipo', key: 'tipo_reclamo' }, { label: 'Lugar', key: 'direccion_incidente' }, { label: 'Descripción', key: 'descripcion' }],
    (i, key) => i[key] || '-'
  );

  addModule('Relevamientos Ejecutados', data.relevamientos,
    [{ label: 'Número', key: 'numero_relevamiento' }, { label: 'Ubicación', key: 'ubicacion' }, { label: 'Tipo', key: 'tipo_relevamiento' }, { label: 'Responsable', key: (r) => r.responsable_nombre || 'No identificado' }],
    (r, key) => typeof key === 'function' ? key(r) : r[key] || '-'
  );

  addModule('Comercios Relevados', data.comercios,
    [{ label: 'Propietario', key: (c) => c.nombre_propietario || '-' }, { label: 'Dirección', key: 'direccion_comercial' }, { label: 'Rubro', key: (c) => c.rubro || '-' }, { label: 'Habilitado', key: (c) => c.esta_habilitado ? 'Sí' : 'No' }],
    (c, key) => typeof key === 'function' ? key(c) : c[key] || '-'
  );

  addModule('Vendedores Ambulantes', data.vendedores,
    [{ label: 'Vendedor', key: (v) => v.nombre_vendedor || '-' }, { label: 'Ubicación', key: 'ubicacion' }, { label: 'Rubro', key: (v) => v.rubro || '-' }, { label: 'Autorizado', key: (v) => v.tiene_autorizacion ? 'Sí' : 'No' }],
    (v, key) => typeof key === 'function' ? key(v) : v[key] || '-'
  );

  // Resumen final
  const r = data.resumen;
  paragraphs.push(sectionTitle('Resumen General'));
  const moduleLabels = [
    ['Tareas', r && r.total_tareas],
    ['Expedientes', r && r.total_expedientes],
    ['Intimaciones', r && r.total_intimaciones],
    ['Infracciones', r && r.total_infracciones],
    ['Reclamos', r && r.total_reclamos],
    ['Relevamientos', r && r.total_relevamientos],
    ['Comercios', r && r.total_comercios],
    ['Vendedores', r && r.total_vendedores],
  ];
  moduleLabels.filter(([, count]) => count > 0).forEach(([label, count]) => {
    paragraphs.push(totalLine(label, count));
  });

  const totalGeneral = moduleLabels.reduce((s, [, c]) => s + (c || 0), 0);
  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({ text: '\nTotal registros: ', font: FONT, size: 22, bold: true, color: '1E3A5F' }),
        new TextRun({ text: String(totalGeneral), font: FONT, size: 22, bold: true, color: '1E3A5F' }),
      ],
      spacing: { before: 200 },
    })
  );

  const doc = new Document({
    title: `Informe Diario ${fecha}`,
    description: 'Informe consolidado de gestión municipal',
    styles: { default: { document: { run: { font: FONT, size: 20 } } } },
    sections: [{ properties: { page: { margin: MARGINS } }, children: paragraphs }],
  });

  return await Packer.toBuffer(doc);
}

module.exports = { generarDocx };