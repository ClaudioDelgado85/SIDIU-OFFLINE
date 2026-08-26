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
      ['plazo', svc.crearTextoPlazo({ numero_intimacion: 'INT-1' })],
    ];

    casos.forEach(([nombre, oracion]) => {
      // Estilo nominal (obs #405): cada oración abre con artículo, no con verbo.
      expect(/^(El|La) /.test(oracion)).toBe(true);
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

  test('acta sin motivo omite la cláusula "por ..." (nunca "por sin mayor detalle")', () => {
    const oracion = svc.crearTextoInfraccion({
      numero_acta: 'A-9',
      nombre_apellido: 'Luis Gómez',
      direccion: 'Av. 25 de Mayo 456',
      motivo_infraccion: null,
      observaciones: '',
    });
    expect(oracion).toBe(
      'El acta de infracción N° A-9, labrada a Luis Gómez, en Av. 25 de Mayo 456.'
    );
    expect(oracion).not.toContain('por ');

    const conMotivo = svc.crearTextoInfraccion({
      numero_acta: 'A-10',
      nombre_apellido: 'Marta Rojas',
      direccion: 'Calle 1',
      motivo_infraccion: 'Obstrucción de vereda',
      observaciones: 'Se notificó en el lugar',
    });
    expect(conMotivo).toContain(
      ', por Obstrucción de vereda; observaciones: Se notificó en el lugar.'
    );
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

describe('calcularVencimientoPlazo y crearTextoPlazo (addenda obs #403)', () => {
  test('vencimiento = otorgamiento + dias con aritmética pura de calendario', () => {
    expect(svc.calcularVencimientoPlazo('2026-08-21', 10)).toBe('31/08/2026');
    // Cruce de mes y año: 2099-12-31 + 10 → 10/01/2100.
    expect(svc.calcularVencimientoPlazo('2099-12-31', 10)).toBe('10/01/2100');
  });

  test('fecha inválida o días no positivos devuelven cadena vacía', () => {
    expect(svc.calcularVencimientoPlazo('no-es-fecha', 5)).toBe('');
    expect(svc.calcularVencimientoPlazo(null, 5)).toBe('');
    expect(svc.calcularVencimientoPlazo('2026-08-21', 0)).toBe('');
  });

  test('oración completa con motivo y vencimiento calculado', () => {
    const oracion = svc.crearTextoPlazo({
      numero_intimacion: 'INT-100',
      nombre_apellido: 'Juan Pérez',
      fecha_otorgamiento: '2026-08-21',
      dias: 10,
      motivo: 'tramitación de planos',
    });
    expect(oracion).toBe(
      'El plazo de 10 días otorgado a la intimación N° INT-100 de Juan Pérez, ' +
      'con motivo tramitación de planos, con vencimiento al 31/08/2026.'
    );
    expect(oracion.match(REGEX_TOKEN_ROTO)).toBeNull();
  });

  test('sin motivo la cláusula se omite; 1 día queda en singular', () => {
    const oracion = svc.crearTextoPlazo({
      numero_intimacion: 'INT-101',
      nombre_apellido: 'María López',
      fecha_otorgamiento: '2026-08-21',
      dias: 1,
      motivo: null,
    });
    expect(oracion).toBe(
      'El plazo de 1 día otorgado a la intimación N° INT-101 de María López, ' +
      'con vencimiento al 22/08/2026.'
    );
    expect(oracion).not.toContain('con motivo');
  });

  test('registro sucio: sin tokens rotos ni fechas rotas en la oración', () => {
    const oracion = svc.crearTextoPlazo({
      numero_intimacion: null,
      nombre_apellido: '',
      fecha_otorgamiento: 'no-es-fecha',
      dias: '-',
      motivo: '-',
    });
    expect(oracion).toContain('sin número');
    expect(oracion).toContain('No identificado');
    expect(oracion).not.toContain('con motivo');
    expect(oracion).toContain('con vencimiento no determinado');
    expect(oracion.match(REGEX_TOKEN_ROTO)).toBeNull();
  });
});

describe('noveno módulo: Plazos Otorgados (addenda obs #403)', () => {
  test('día con registros incl. un plazo: claves incluyen plazos y totalGeneral los suma', () => {
    const resultado = svc.crearSeccionesNarrativas({
      fecha: '2026-08-21',
      tareas: [{ titulo: 'X', descripcion: 'Y' }],
      plazos: [
        { numero_intimacion: 'INT-9', nombre_apellido: 'Contribuyente Prueba', fecha_otorgamiento: '2026-08-21', dias: 10, motivo: 'planos' },
      ],
    });
    expect(resultado.secciones.map((s) => s.clave)).toEqual(['tareas', 'plazos']);
    const plazos = resultado.secciones.find((s) => s.clave === 'plazos');
    expect(plazos.titulo).toBe('Plazos Otorgados');
    expect(plazos.totalSeccion).toBe(1);
    expect(plazos.items[0]).toContain('El plazo de 10 días otorgado');
    // R6 enmendado: el total general suma LAS 9 secciones.
    expect(resultado.totalGeneral).toBe(2);
    expect(resultado.fraseTotalGeneral).toBe('Total general de gestiones: 2');
    expect(resultado.lineasResumen).toEqual([
      { etiqueta: 'Tareas', cantidad: 1 },
      { etiqueta: 'Plazos', cantidad: 1 },
    ]);
  });

  test('jornada sin plazos: la sección no aparece y el día vacío sigue siendo []', () => {
    const resultado = svc.crearSeccionesNarrativas({
      fecha: '2026-08-21',
      tareas: [{ titulo: 'X', descripcion: 'Y' }],
    });
    expect(resultado.secciones.find((s) => s.clave === 'plazos')).toBeUndefined();

    const vacio = svc.crearSeccionesNarrativas({ fecha: '2026-08-21' });
    expect(vacio.secciones).toEqual([]);
    expect(vacio.totalGeneral).toBe(0);
    expect(vacio.fraseTotalGeneral).toBe('Total general de gestiones: 0');
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
    plazos: [{ numero_intimacion: null, nombre_apellido: '', fecha_otorgamiento: null, dias: 0, motivo: '-' }],
  };

  function recolectarTextos(narrativa) {
    const textos = [narrativa.introduccion, narrativa.cierre, narrativa.fraseTotalGeneral];
    narrativa.secciones.forEach((seccion) => {
      textos.push(seccion.titulo, seccion.parrafoResumen, seccion.textoVacio);
      if (seccion.clave === 'expedientes' && Array.isArray(seccion.grupos)) {
        seccion.grupos.forEach((grupo) => {
          textos.push(grupo.subtitulo, ...(grupo.items || []));
        });
      } else if (Array.isArray(seccion.items)) {
        textos.push(...seccion.items);
      }
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
      // expedientes e intimaciones usan grupos en lugar de items plano
      if (seccion.clave === 'expedientes' || seccion.clave === 'intimaciones') {
        expect(seccion.grupos).toBeDefined();
        expect(Array.isArray(seccion.grupos)).toBe(true);
        const totalItems = seccion.grupos.reduce((sum, g) => sum + (g.items?.length || 0), 0);
        expect(totalItems).toBe(1);
      } else {
        expect(seccion.items).toHaveLength(1);
      }
    });
    expect(narrativa.totalGeneral).toBe(9);
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

describe('conector "se detallan a continuación" en el párrafo resumen (obs #405)', () => {
  test('1 tarea (f, singular): ", la cual se detalla a continuación."', () => {
    const resultado = svc.crearSeccionesNarrativas({
      fecha: '2026-08-21',
      tareas: [{ titulo: 'X', descripcion: 'Y' }],
    });
    const tareas = resultado.secciones.find((s) => s.clave === 'tareas');
    expect(tareas.parrafoResumen).toBe(
      'Se consigna un total de 1 tarea registrada durante la jornada, la cual se detalla a continuación.'
    );
  });

  test('3 expedientes (m, plural): ", los cuales se detallan a continuación."', () => {
    const resultado = svc.crearSeccionesNarrativas({
      fecha: '2026-08-21',
      expedientes: [
        { numero_expediente: 'EX-1', nombre_apellido: 'A', motivo: 'M1', estado: 'ingreso', direccion: 'D1' },
        { numero_expediente: 'EX-2', nombre_apellido: 'B', motivo: 'M2', estado: 'salida', direccion: 'D2' },
        { numero_expediente: 'EX-3', nombre_apellido: 'C', motivo: 'M3', estado: 'ingreso', direccion: 'D3' },
      ],
    });
    const expedientes = resultado.secciones.find((s) => s.clave === 'expedientes');
    expect(expedientes.parrafoResumen).toBe(
      'Se consigna un total de 3 expedientes registrados durante la jornada, los cuales se detallan a continuación.'
    );
  });

  test('2 tareas (f, plural): ", las cuales se detallan a continuación."', () => {
    const resultado = svc.crearSeccionesNarrativas({
      fecha: '2026-08-21',
      tareas: [
        { titulo: 'X', descripcion: 'Y' },
        { titulo: 'Z', descripcion: 'W' },
      ],
    });
    const tareas = resultado.secciones.find((s) => s.clave === 'tareas');
    expect(tareas.parrafoResumen).toContain(', las cuales se detallan a continuación.');
  });

  test('1 expediente (m, singular): ", el cual se detalla a continuación."', () => {
    const resultado = svc.crearSeccionesNarrativas({
      fecha: '2026-08-21',
      expedientes: [
        { numero_expediente: 'EX-1', nombre_apellido: 'A', motivo: 'M1', estado: 'ingreso', direccion: 'D1' },
      ],
    });
    const expedientes = resultado.secciones.find((s) => s.clave === 'expedientes');
    expect(expedientes.parrafoResumen).toContain(', el cual se detalla a continuación.');
  });

  test('invariante #401: sin registros no hay sección ni conector colgante', () => {
    const resultado = svc.crearSeccionesNarrativas({ fecha: '2026-08-21' });
    expect(resultado.secciones).toEqual([]);
    const textos = resultado.secciones.map((s) => s.parrafoResumen).join(' ');
    expect(textos).not.toContain('a continuación');
  });

  test('etiquetas de estado nominales tras la cópula "cuyo estado actual es"', () => {
    const ingreso = svc.crearTextoExpediente({
      numero_expediente: 'EX-9', nombre_apellido: 'A', motivo: 'M',
      estado: 'ingreso', direccion: 'D',
    });
    expect(ingreso).toContain('cuyo estado actual es Ingreso.');
    const salida = svc.crearTextoExpediente({
      numero_expediente: 'EX-10', nombre_apellido: 'B', motivo: 'M',
      estado: 'salida', direccion: 'D',
    });
    expect(salida).toContain('cuyo estado actual es Salida.');
    expect(salida).not.toContain('Dio salida');
  });
});

describe('expedientes agrupados por estado (sub-títulos)', () => {
  test('estados mixtos → 3 grupos con subtítulos correctos y conteos', () => {
    const resultado = svc.crearSeccionesNarrativas({
      fecha: '2026-08-21',
      expedientes: [
        { numero_expediente: 'EX-1', nombre_apellido: 'A', motivo: 'M1', estado: 'ingreso', direccion: 'D1' },
        { numero_expediente: 'EX-2', nombre_apellido: 'B', motivo: 'M2', estado: 'ingreso', direccion: 'D2' },
        { numero_expediente: 'EX-3', nombre_apellido: 'C', motivo: 'M3', estado: 'en_inspeccion', direccion: 'D3' },
        { numero_expediente: 'EX-4', nombre_apellido: 'D', motivo: 'M4', estado: 'plazo_otorgado', direccion: 'D4' },
      ],
    });
    const expedientes = resultado.secciones.find((s) => s.clave === 'expedientes');
    expect(expedientes).toBeDefined();
    expect(expedientes.grupos).toHaveLength(3);
    // Orden: ingreso, en_inspeccion, plazo_otorgado, salida
    expect(expedientes.grupos[0].clave).toBe('ingreso');
    expect(expedientes.grupos[0].subtitulo).toBe('Expedientes ingresados');
    expect(expedientes.grupos[0].totalSeccion).toBe(2);
    expect(expedientes.grupos[0].items).toHaveLength(2);
    expect(expedientes.grupos[1].clave).toBe('en_inspeccion');
    expect(expedientes.grupos[1].subtitulo).toBe('Expedientes en inspección');
    expect(expedientes.grupos[1].totalSeccion).toBe(1);
    expect(expedientes.grupos[2].clave).toBe('plazo_otorgado');
    expect(expedientes.grupos[2].subtitulo).toBe('Expedientes con plazo otorgado');
    expect(expedientes.grupos[2].totalSeccion).toBe(1);
    // totalSeccion general = 4
    expect(expedientes.totalSeccion).toBe(4);
    // totalGeneral y fraseTotalGeneral no cambian
    expect(resultado.totalGeneral).toBe(4);
    expect(resultado.fraseTotalGeneral).toBe('Total general de gestiones: 4');
  });

  test('todos en un solo estado → 1 grupo', () => {
    const resultado = svc.crearSeccionesNarrativas({
      fecha: '2026-08-21',
      expedientes: [
        { numero_expediente: 'EX-1', nombre_apellido: 'A', motivo: 'M1', estado: 'salida', direccion: 'D1' },
        { numero_expediente: 'EX-2', nombre_apellido: 'B', motivo: 'M2', estado: 'salida', direccion: 'D2' },
        { numero_expediente: 'EX-3', nombre_apellido: 'C', motivo: 'M3', estado: 'salida', direccion: 'D3' },
      ],
    });
    const expedientes = resultado.secciones.find((s) => s.clave === 'expedientes');
    expect(expedientes.grupos).toHaveLength(1);
    expect(expedientes.grupos[0].clave).toBe('salida');
    expect(expedientes.grupos[0].subtitulo).toBe('Expedientes con salida');
    expect(expedientes.grupos[0].totalSeccion).toBe(3);
    expect(expedientes.totalSeccion).toBe(3);
    expect(resultado.totalGeneral).toBe(3);
  });

  test('día sin expedientes → sección expedientes ausente (coherente con #401)', () => {
    const resultado = svc.crearSeccionesNarrativas({
      fecha: '2026-08-21',
      tareas: [{ titulo: 'X', descripcion: 'Y' }],
    });
    expect(resultado.secciones.find((s) => s.clave === 'expedientes')).toBeUndefined();
    // totalGeneral sigue sumando solo las secciones con registros
    expect(resultado.totalGeneral).toBe(1);
    expect(resultado.fraseTotalGeneral).toBe('Total general de gestiones: 1');
  });

  test('estado desconocido en expediente cae en grupo "ingreso" por defecto', () => {
    const resultado = svc.crearSeccionesNarrativas({
      fecha: '2026-08-21',
      expedientes: [
        { numero_expediente: 'EX-1', nombre_apellido: 'A', motivo: 'M1', estado: 'estado_invalido', direccion: 'D1' },
      ],
    });
    const expedientes = resultado.secciones.find((s) => s.clave === 'expedientes');
    expect(expedientes.grupos).toHaveLength(1);
    expect(expedientes.grupos[0].clave).toBe('ingreso');
  });
});
