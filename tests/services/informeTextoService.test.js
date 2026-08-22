// tests/services/informeTextoService.test.js
// Pruebas unitarias puras del servicio de redacción narrativa (sin base de datos).

const svc = require('../../services/informeTextoService');

// Ninguna oración generada puede contener tokens rotos "-", "undefined" o "null".
const REGEX_TOKEN_ROTO = /(^|\s)(-|undefined|null)(\s|$)/;

describe('pluralizar', () => {
  test('cantidad 1 devuelve el singular', () => {
    expect(svc.pluralizar(1, 'tarea', 'tareas')).toBe('tarea');
  });

  test('cantidad 2 devuelve el plural', () => {
    expect(svc.pluralizar(2, 'tarea', 'tareas')).toBe('tareas');
  });

  test('cantidad 0 devuelve el plural', () => {
    expect(svc.pluralizar(0, 'gestión', 'gestiones')).toBe('gestiones');
  });
});

describe('formatearFechaInforme', () => {
  test('convierte YYYY-MM-DD en DD/MM/YYYY', () => {
    expect(svc.formatearFechaInforme('2026-08-21')).toBe('21/08/2026');
  });

  test('mantiene ceros a la izquierda', () => {
    expect(svc.formatearFechaInforme('2026-01-05')).toBe('05/01/2026');
  });

  test('fecha vacía devuelve cadena vacía', () => {
    expect(svc.formatearFechaInforme('')).toBe('');
    expect(svc.formatearFechaInforme(null)).toBe('');
  });
});

describe('texto (sanitizador)', () => {
  const CASOS_VACIOS = [null, undefined, '', '   ', '-', 'undefined', 'null'];

  test.each(CASOS_VACIOS)('el valor %p se sustituye por el defecto', (vacio) => {
    expect(svc.texto(vacio, 'sin mayor detalle')).toBe('sin mayor detalle');
  });

  test('un valor válido se recorta y se respeta', () => {
    expect(svc.texto('  Av. San Martín 123 ', 'x')).toBe('Av. San Martín 123');
  });
});

describe('constructores de oraciones con registros incompletos', () => {
  // Registro mínimo: todos los campos opcionales ausentes o vacíos.
  test('cada constructor produce una oración gramatical y sin tokens rotos', () => {
    const casos = [
      ['tarea', svc.crearTextoTarea({ titulo: 'Tarea incompleta' })],
      ['expediente', svc.crearTextoExpediente({ numero_expediente: 'EX-1' })],
      ['intimacion', svc.crearTextoIntimacion({})],
      ['infraccion', svc.crearTextoInfraccion({ numero_acta: 'A-1' })],
      ['reclamo', svc.crearTextoReclamo({ numero_reclamo: 'R-1' })],
      ['relevamiento', svc.crearTextoRelevamiento({ numero_relevamiento: 'RE-1' })],
      ['comercio', svc.crearTextoComercio({ direccion_comercial: 'Belgrano 45' })],
      ['vendedor', svc.crearTextoVendedor({ ubicacion: 'Plaza San Martín' })],
    ];

    casos.forEach(([nombre, oracion]) => {
      expect(oracion.startsWith('Se ')).toBe(true);
      expect(oracion.endsWith('.')).toBe(true);
      expect(oracion.match(REGEX_TOKEN_ROTO)).toBeNull();
      expect(oracion.length).toBeGreaterThan(40);
    });
  });

  test('tarea sin ubicación ni detalle queda gramatical', () => {
    const oracion = svc.crearTextoTarea({
      titulo: 'Recorrido de verificación',
      descripcion: '',
      direccion: null,
      categoria_nombre: null,
    });
    expect(oracion).toContain('ubicación no registrada');
    expect(oracion).toContain('sin mayor detalle');
    expect(oracion.match(REGEX_TOKEN_ROTO)).toBeNull();
  });
});

describe('crearSeccionesNarrativas — forma con 2 tareas y 0 expedientes', () => {
  const data = {
    fecha: '2026-08-21',
    tareas: [
      { id: 1, titulo: 'Limpieza de bocacalle', descripcion: 'Retiro de escombros', direccion: 'Av. San Martín 123', categoria_nombre: 'Operativos', barrio_nombre: 'Centro' },
      { id: 2, titulo: 'Verificación de frentes', descripcion: '', direccion: null, categoria_nombre: null },
    ],
    expedientes: [],
    intimaciones: [],
    infracciones: [],
    reclamos: [],
    relevamientos: [],
    comercios: [],
    vendedores: [],
  };
  const resultado = svc.crearSeccionesNarrativas(data);

  test('omite las secciones sin registros: solo tareas llega al resultado', () => {
    // Pilot feedback 2: los módulos en 0 NO aparecen en el documento.
    expect(resultado.secciones.map((s) => s.clave)).toEqual(['tareas']);
  });

  test('sección tareas: resumen cita 2, exactamente 2 items, totalSeccion 2', () => {
    const tareas = resultado.secciones.find((s) => s.clave === 'tareas');
    expect(tareas.titulo).toBe('Tareas y Operativos');
    expect(tareas.parrafoResumen).toContain('2');
    expect(tareas.items).toHaveLength(2);
    expect(tareas.totalSeccion).toBe(2);
    tareas.items.forEach((item) => expect(item.match(REGEX_TOKEN_ROTO)).toBeNull());
  });

  test('sección expedientes en 0: AUSENTE del resultado (sin leyenda de módulo vacío)', () => {
    expect(resultado.secciones.find((s) => s.clave === 'expedientes')).toBeUndefined();
  });

  test('fechaFormateada, lineasResumen, fraseTotalGeneral y totalGeneral coherentes', () => {
    expect(resultado.fechaFormateada).toBe('21/08/2026');
    // Pilot feedback: los módulos en 0 NO generan línea de resumen.
    expect(resultado.lineasResumen).toEqual([{ etiqueta: 'Tareas', cantidad: 2 }]);
    // R6 intacto: el total general suma las 8 secciones aunque no se listen.
    expect(resultado.totalGeneral).toBe(2);
    expect(resultado.fraseTotalGeneral).toContain('2');
  });
});

describe('calcularTotalGeneral', () => {
  test('suma los totales del escenario 4,3,1,0,2,5,6,7 → 28', () => {
    expect(svc.calcularTotalGeneral([4, 3, 1, 0, 2, 5, 6, 7])).toBe(28);
  });

  test('suma objetos sección por su totalSeccion', () => {
    const secciones = [{ totalSeccion: 4 }, { totalSeccion: 3 }, { totalSeccion: 0 }];
    expect(svc.calcularTotalGeneral(secciones)).toBe(7);
  });

  test('entrada vacía suma 0', () => {
    expect(svc.calcularTotalGeneral([])).toBe(0);
  });
});

describe('bloque de firma fijo', () => {
  const resultado = svc.crearSeccionesNarrativas({ fecha: '2026-08-21' });

  test('contiene línea, aclaración, cargo y lugar/fecha literales', () => {
    expect(resultado.firma.linea).toBe('________________________');
    expect(resultado.firma.aclaracion).toBe('Firma y aclaración');
    expect(resultado.firma.cargo).toBe('Dirección de Inspección Urbana');
    expect(resultado.firma.lugarFecha).toBe('Lugar y fecha');
  });
});

describe('introducción y cierre', () => {
  const resultado = svc.crearSeccionesNarrativas({
    fecha: '2026-08-21',
    tareas: [{ titulo: 'X', descripcion: 'Y' }],
  });

  test('la introducción no está vacía y menciona la fecha formateada', () => {
    expect(typeof resultado.introduccion).toBe('string');
    expect(resultado.introduccion.length).toBeGreaterThan(50);
    expect(resultado.introduccion).toContain('21/08/2026');
  });

  test('el cierre es el texto formal simplificado exacto', () => {
    expect(resultado.cierre).toBe(
      'Sin otro particular, se eleva el presente informe para su consideración y fines que estime corresponder.'
    );
  });
});

describe('resumen ejecutivo filtra módulos en cero (pilot feedback)', () => {
  test('día con conteos mixtos: solo los módulos con registros generan línea', () => {
    const resultado = svc.crearSeccionesNarrativas({
      fecha: '2026-08-21',
      tareas: [
        { titulo: 'X', descripcion: 'Y' },
        { titulo: 'Z', descripcion: 'W' },
      ],
      infracciones: [
        { numero_acta: 'A-1', nombre_apellido: 'Fulano', direccion: 'Belgrano 45', motivo_infraccion: 'obstrucción de vereda' },
        { numero_acta: 'A-2', nombre_apellido: 'Mengano', direccion: 'San Martín 123', motivo_infraccion: 'ruidos molestos' },
        { numero_acta: 'A-3', nombre_apellido: 'Perengano', direccion: 'Belgrano 46', motivo_infraccion: 'basura' },
      ],
    });
    expect(resultado.lineasResumen).toEqual([
      { etiqueta: 'Tareas', cantidad: 2 },
      { etiqueta: 'Actas de Infracción', cantidad: 3 },
    ]);
    // R6 intacto: el total general suma las 8 secciones aunque no se listen.
    expect(resultado.totalGeneral).toBe(5);
    expect(resultado.fraseTotalGeneral).toBe('Total general de gestiones: 5');
  });

  test('jornada sin registros: lineasResumen vacía y total general 0', () => {
    const resultado = svc.crearSeccionesNarrativas({ fecha: '2026-08-21' });
    expect(resultado.lineasResumen).toEqual([]);
    expect(resultado.totalGeneral).toBe(0);
    expect(resultado.fraseTotalGeneral).toBe('Total general de gestiones: 0');
  });
});

describe('secciones en cero se omiten del documento (pilot feedback 2)', () => {
  test('día mixto: solo módulos con registros llegan a secciones, en orden de presentación', () => {
    const resultado = svc.crearSeccionesNarrativas({
      fecha: '2026-08-21',
      tareas: [{ titulo: 'X', descripcion: 'Y' }],
      infracciones: [
        { numero_acta: 'A-1', nombre_apellido: 'Fulano', direccion: 'Belgrano 45', motivo_infraccion: 'obstrucción de vereda' },
      ],
    });
    expect(resultado.secciones.map((s) => s.clave)).toEqual(['tareas', 'actas']);
    // R6 intacto: el total se calcula ANTES del filtro y suma las 8 secciones.
    expect(resultado.totalGeneral).toBe(2);
    expect(resultado.fraseTotalGeneral).toBe('Total general de gestiones: 2');
  });

  test('día totalmente vacío: secciones [] con intro/resumen/cierre/firma y totalGeneral 0', () => {
    const resultado = svc.crearSeccionesNarrativas({ fecha: '2026-08-21' });
    expect(resultado.secciones).toEqual([]);
    expect(resultado.lineasResumen).toEqual([]);
    expect(resultado.totalGeneral).toBe(0);
    expect(resultado.fraseTotalGeneral).toBe('Total general de gestiones: 0');
    expect(resultado.fechaFormateada).toBe('21/08/2026');
    expect(resultado.introduccion.length).toBeGreaterThan(50);
    expect(resultado.cierre).toBe(
      'Sin otro particular, se eleva el presente informe para su consideración y fines que estime corresponder.'
    );
    expect(resultado.firma).toEqual({
      linea: '________________________',
      aclaracion: 'Firma y aclaración',
      cargo: 'Dirección de Inspección Urbana',
      lugarFecha: 'Lugar y fecha',
    });
  });
});

describe('sanitización global sobre datos sucios', () => {
  const dataSucia = {
    fecha: '2026-08-21',
    tareas: [{ titulo: '', descripcion: null, direccion: '-', categoria_nombre: '', barrio_nombre: null }],
    expedientes: [{ numero_expediente: '', nombre_apellido: null, motivo: '-', estado: '', direccion: null }],
    intimaciones: [{ numero_intimacion: null, nombre_apellido: '', direccion: null, tipo: null, tipo_label: null, tipo_obstruccion_label: null, rubro_comercial_label: null, plazo_dias: 0 }],
    infracciones: [{ numero_acta: '', nombre_apellido: null, direccion: null, motivo_infraccion: '', observaciones: null }],
    reclamos: [{ numero_reclamo: '', tipo_reclamo: '', descripcion: null, direccion_incidente: '' }],
    relevamientos: [{ numero_relevamiento: '', tipo_relevamiento: null, ubicacion: '', responsable_nombre: null, observaciones: '-' }],
    comercios: [{ nombre_propietario: null, direccion_comercial: '', rubro: null, esta_habilitado: 0 }],
    vendedores: [{ nombre_vendedor: null, ubicacion: null, rubro: '', tiene_autorizacion: 0 }],
  };

  function recolectarTextos(narrativa) {
    const textos = [narrativa.introduccion, narrativa.cierre, narrativa.fraseTotalGeneral];
    narrativa.secciones.forEach((seccion) => {
      textos.push(seccion.titulo, seccion.parrafoResumen, seccion.textoVacio, ...seccion.items);
    });
    return textos;
  }

  test('ningún texto generado contiene "-", "undefined" ni "null" como token', () => {
    const narrativa = svc.crearSeccionesNarrativas(dataSucia);
    recolectarTextos(narrativa).forEach((textoGenerado) => {
      expect(textoGenerado.match(REGEX_TOKEN_ROTO)).toBeNull();
    });
  });

  test('los totales reflejan un registro por módulo aunque venga sucio', () => {
    const narrativa = svc.crearSeccionesNarrativas(dataSucia);
    narrativa.secciones.forEach((seccion) => {
      expect(seccion.totalSeccion).toBe(1);
      expect(seccion.items).toHaveLength(1);
    });
    expect(narrativa.totalGeneral).toBe(8);
  });
});

describe('concordancia de género y número del participio', () => {
  test('1 tarea produce "1 tarea registrada" en el resumen de sección', () => {
    const resultado = svc.crearSeccionesNarrativas({
      fecha: '2026-08-21',
      tareas: [{ titulo: 'X', descripcion: 'Y' }],
    });
    const tareas = resultado.secciones.find((s) => s.clave === 'tareas');
    expect(tareas.parrafoResumen).toContain('1 tarea registrada');
  });

  test('2 actas de infracción producen "2 actas de infracción registradas"', () => {
    const resultado = svc.crearSeccionesNarrativas({
      fecha: '2026-08-21',
      infracciones: [
        { numero_acta: 'A-1', nombre_apellido: 'Fulano', direccion: 'Belgrano 45', motivo_infraccion: 'obstrucción de vereda' },
        { numero_acta: 'A-2', nombre_apellido: 'Mengano', direccion: 'San Martín 123', motivo_infraccion: 'ruidos molestos' },
      ],
    });
    const actas = resultado.secciones.find((s) => s.clave === 'actas');
    expect(actas.parrafoResumen).toContain('registradas');
    expect(actas.parrafoResumen).toContain('2 actas de infracción registradas');
  });

  test('totalGeneral 1 produce "que se detalla en" en la introducción', () => {
    const resultado = svc.crearSeccionesNarrativas({
      fecha: '2026-08-21',
      tareas: [{ titulo: 'X', descripcion: 'Y' }],
    });
    expect(resultado.totalGeneral).toBe(1);
    expect(resultado.introduccion).toContain('que se detalla en');
  });
});
