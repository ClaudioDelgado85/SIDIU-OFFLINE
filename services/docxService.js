const { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, WidthType, AlignmentType, BorderStyle } = require('docx');

const FONT = 'Calibri';
const MARGINS = { top: 1440, bottom: 1440, left: 1440, right: 1440 };

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

// ── Generar documento Word ──────────────────────────────────
async function generarDocx(data) {
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

  addModule('Expedientes Ingresados', data.expedientes,
    [{ label: 'Número', key: 'numero_expediente' }, { label: 'Contribuyente', key: 'nombre_apellido' }, { label: 'Motivo', key: 'motivo' }, { label: 'Estado', key: 'estado' }],
    (i, key) => i[key] || '-'
  );

  addModule('Intimaciones Realizadas', data.intimaciones,
    [{ label: 'Nro', key: 'numero_intimacion' }, { label: 'Contribuyente', key: 'nombre_apellido' }, { label: 'Dirección', key: 'direccion' }, { label: 'Tipo', key: (i) => i.tipo }, { label: 'Plazo', key: (i) => i.plazo_dias > 0 ? `${i.plazo_dias} días` : 'Inmediato' }],
    (i, key) => typeof key === 'function' ? key(i) : i[key] ?? '-'
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
    ['Tareas', r?.total_tareas],
    ['Expedientes', r?.total_expedientes],
    ['Intimaciones', r?.total_intimaciones],
    ['Infracciones', r?.total_infracciones],
    ['Reclamos', r?.total_reclamos],
    ['Relevamientos', r?.total_relevamientos],
    ['Comercios', r?.total_comercios],
    ['Vendedores', r?.total_vendedores],
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