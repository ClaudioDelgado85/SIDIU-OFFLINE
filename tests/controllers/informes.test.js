// tests/controllers/informes.test.js
// Suite de pruebas para el módulo de Informes (GET /api/informes/diario)
// R4: el endpoint adjunta seccionesNarrativas SIN alterar los arrays crudos.

const { app, request, loginAsAdmin } = require('../setup');
const db = require('../../config/database');

describe('📊 Informes (/api/informes/diario)', () => {
  let token;

  // Fecha aislada en futuro lejano: ningún dato real puede colisionar.
  const FECHA_FIXTURES = '2099-12-31';
  const FECHA_VACIA = '2098-01-01';
  const SUFIJO = `${process.pid}${Date.now()}`;

  async function querySql(sql, params = []) {
    const [rows] = await db.pool.execute(sql, params);
    return rows;
  }

  // Limpieza defensiva: borra restos de corridas anteriores (UNIQUE friendly).
  // Los plazos se borran ANTES que su intimación padre (orden seguro sin
  // depender de que el PRAGMA foreign_keys esté activo).
  async function limpiarFixtures() {
    await querySql("DELETE FROM plazos_intimacion WHERE usuario LIKE 'TEST-INFORME-%'");
    await querySql("DELETE FROM intimaciones WHERE direccion = 'CALLE TEST INFORME 400'");
    await querySql("DELETE FROM tareas_diarias WHERE titulo LIKE 'TEST-INFORME-%'");
    await querySql("DELETE FROM expedientes WHERE numero_expediente LIKE 'TEST-INFORME-%'");
    await querySql("DELETE FROM infracciones WHERE numero_acta LIKE 'TEST-INFORME-%'");
  }

  // Inserta 1 registro en cada uno de 3 módulos + intimación con plazo y devuelve sus ids.
  async function crearFixtures() {
    const [catalogo] = await querySql('SELECT id FROM catalogos ORDER BY id LIMIT 1');
    if (!catalogo) throw new Error('No hay catálogos sembrados: no se puede crear la tarea de prueba');

    const tarea = await querySql(
      `INSERT INTO tareas_diarias (fecha, titulo, descripcion, direccion, categoria_id)
       VALUES (?, ?, ?, ?, ?)`,
      [FECHA_FIXTURES, `TEST-INFORME-TAREA-${SUFIJO}`, 'Registro creado por test automatizado', 'CALLE TEST INFORME 100', catalogo.id]
    );

    const expediente = await querySql(
      `INSERT INTO expedientes (fecha, numero_expediente, nombre_apellido, dni, motivo, direccion, estado)
       VALUES (?, ?, ?, ?, ?, ?, 'ingreso')`,
      [FECHA_FIXTURES, `TEST-INFORME-EXP-${SUFIJO}`, 'TEST QA CONTRIBUYENTE', '99999991', 'Motivo de prueba automatizada', 'CALLE TEST INFORME 200']
    );

    const acta = await querySql(
      `INSERT INTO infracciones (fecha, nombre_apellido, dni, numero_acta, direccion, motivo_infraccion)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [FECHA_FIXTURES, 'TEST QA INFRACTOR', '99999992', `TEST-INFORME-ACTA-${SUFIJO}`, 'CALLE TEST INFORME 300', 'Motivo de prueba automatizada']
    );

    // Addenda obs #403: intimación padre + prórroga otorgada ese mismo día.
    const intimacion = await querySql(
      `INSERT INTO intimaciones (fecha, tipo, nombre_apellido, dni, direccion, plazo_dias, numero_intimacion)
       VALUES (?, 'general', 'TEST QA INTIMADO', '99999993', 'CALLE TEST INFORME 400', 5, 9001)`,
      [FECHA_FIXTURES]
    );

    const plazo = await querySql(
      `INSERT INTO plazos_intimacion (intimacion_id, fecha_otorgamiento, dias, motivo, usuario)
       VALUES (?, ?, ?, ?, ?)`,
      [intimacion.insertId, FECHA_FIXTURES, 10, 'Motivo de prueba automatizada', `TEST-INFORME-PLAZO-${SUFIJO}`]
    );

    return {
      tareaId: tarea.insertId,
      expedienteId: expediente.insertId,
      actaId: acta.insertId,
      intimacionId: intimacion.insertId,
      plazoId: plazo.insertId
    };
  }

  beforeAll(async () => {
    token = await loginAsAdmin();
  });

  describe('GET /api/informes/diario — payload enriquecido (R4)', () => {
    let ids;

    beforeAll(async () => {
      await limpiarFixtures();
      ids = await crearFixtures();
    });

    afterAll(async () => {
      await limpiarFixtures();
    });

    test('Adjunta seccionesNarrativas solo con los módulos con registros (coherentes)', async () => {
      const res = await request(app)
        .get(`/api/informes/diario?fecha=${FECHA_FIXTURES}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);

      const data = res.body.data;
      const narrativo = data.seccionesNarrativas;
      expect(narrativo).toBeDefined();

      // Pilot feedback 2: las secciones en 0 se omiten; el largo debe coincidir
      // con la cantidad de módulos NO vacíos del payload crudo (9 con addenda).
      const modulosConRegistros = [
        data.tareas, data.expedientes, data.intimaciones, data.infracciones,
        data.reclamos, data.relevamientos, data.comercios, data.vendedores,
        data.plazos,
      ].filter((arr) => Array.isArray(arr) && arr.length > 0);
      expect(modulosConRegistros.length).toBeGreaterThan(0);
      expect(narrativo.secciones.length).toBe(modulosConRegistros.length);

      // Cada sección conservada tiene la forma del contrato D6.
      // expedientes usa grupos en lugar de items plano
      narrativo.secciones.forEach((seccion) => {
        const clavesBase = ['clave', 'titulo', 'parrafoResumen', 'totalSeccion', 'textoVacio'];
        if (seccion.clave === 'expedientes' || seccion.clave === 'intimaciones') {
          expect(Object.keys(seccion)).toEqual(expect.arrayContaining([...clavesBase, 'grupos']));
          expect(Array.isArray(seccion.grupos)).toBe(true);
        } else {
          expect(Object.keys(seccion)).toEqual(expect.arrayContaining([...clavesBase, 'items']));
          expect(Array.isArray(seccion.items)).toBe(true);
        }
        expect(typeof seccion.parrafoResumen).toBe('string');
        expect(seccion.totalSeccion).toBeGreaterThan(0);
      });

      // Coherencia narrativa ↔ arrays crudos (misma fuente de datos).
      const porClave = {};
      narrativo.secciones.forEach((s) => { porClave[s.clave] = s; });
      expect(porClave.tareas.totalSeccion).toBe(res.body.data.tareas.length);
      expect(porClave.expedientes.totalSeccion).toBe(res.body.data.expedientes.length);
      expect(porClave.actas.totalSeccion).toBe(res.body.data.infracciones.length);
      expect(narrativo.secciones.reduce((suma, s) => suma + s.totalSeccion, 0))
        .toBe(narrativo.totalGeneral);
      expect(narrativo.fechaFormateada).toBe('31/12/2099');
    });

    test('Addenda plazos: payload crudo, resumen y narrativa coherentes', async () => {
      const res = await request(app)
        .get(`/api/informes/diario?fecha=${FECHA_FIXTURES}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      const data = res.body.data;

      // Payload crudo: la fila del plazo llega con el JOIN a intimaciones.
      expect(Array.isArray(data.plazos)).toBe(true);
      const fila = data.plazos.find((p) => p.usuario === `TEST-INFORME-PLAZO-${SUFIJO}`);
      expect(fila).toBeDefined();
      expect(Object.keys(fila)).toEqual(expect.arrayContaining([
        'id', 'fecha_otorgamiento', 'dias', 'motivo', 'usuario',
        'numero_intimacion', 'nombre_apellido'
      ]));
      expect(Number(fila.dias)).toBe(10);
      expect(fila.fecha_otorgamiento).toBe(FECHA_FIXTURES);
      expect(fila.nombre_apellido).toBe('TEST QA INTIMADO');
      expect(Number(fila.numero_intimacion)).toBe(9001);

      // Resumen numérico: noveno contador alineado con el array crudo.
      expect(data.resumen.total_plazos).toBe(data.plazos.length);

      // Narrativa: sección presente y coherente con el crudo.
      const porClave = {};
      data.seccionesNarrativas.secciones.forEach((s) => { porClave[s.clave] = s; });
      expect(porClave.plazos).toBeDefined();
      expect(porClave.plazos.titulo).toBe('Plazos Otorgados');
      expect(porClave.plazos.totalSeccion).toBe(data.plazos.length);
      const itemPlazo = porClave.plazos.items.find((item) => item.includes('N° 9001'));
      expect(itemPlazo).toBeDefined();
      expect(itemPlazo).toContain('El plazo de 10 días otorgado');
      // Vencimiento = otorgamiento + dias: 2099-12-31 + 10 → 10/01/2100.
      expect(itemPlazo).toContain('vencimiento al 10/01/2100');

      // R6 enmendado: el total general suma también los plazos.
      expect(data.seccionesNarrativas.totalGeneral)
        .toBe(Object.values(porClave).reduce((suma, s) => suma + s.totalSeccion, 0));
    });

    test('Los arrays crudos conservan su forma de campos actual (≥3 módulos)', async () => {
      const res = await request(app)
        .get(`/api/informes/diario?fecha=${FECHA_FIXTURES}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      const data = res.body.data;

      // Contrato actual de cada módulo: campos propios + alias de los JOINs.
      // Tareas: t.* + categoria_nombre + barrio_nombre
      data.tareas.forEach((fila) => {
        expect(Object.keys(fila)).toEqual(expect.arrayContaining([
          'id', 'fecha', 'titulo', 'descripcion', 'direccion',
          'categoria_nombre', 'barrio_nombre'
        ]));
      });
      expect(data.tareas.some((f) => f.titulo === `TEST-INFORME-TAREA-${SUFIJO}`)).toBe(true);

      // Expedientes: e.* + barrio_nombre
      data.expedientes.forEach((fila) => {
        expect(Object.keys(fila)).toEqual(expect.arrayContaining([
          'id', 'fecha', 'numero_expediente', 'nombre_apellido',
          'motivo', 'estado', 'barrio_nombre'
        ]));
      });
      expect(data.expedientes.some((f) => f.numero_expediente === `TEST-INFORME-EXP-${SUFIJO}`)).toBe(true);

      // Infracciones: inf.* + barrio_nombre
      data.infracciones.forEach((fila) => {
        expect(Object.keys(fila)).toEqual(expect.arrayContaining([
          'id', 'fecha', 'numero_acta', 'nombre_apellido',
          'direccion', 'motivo_infraccion', 'observaciones', 'barrio_nombre'
        ]));
      });
      expect(data.infracciones.some((f) => f.numero_acta === `TEST-INFORME-ACTA-${SUFIJO}`)).toBe(true);

      // El resumen numérico previo sigue intacto junto al narrativo.
      expect(data.resumen.total_tareas).toBe(data.tareas.length);
      expect(data.resumen.total_expedientes).toBe(data.expedientes.length);
      expect(data.resumen.total_infracciones).toBe(data.infracciones.length);
    });
  });

  describe('GET /api/informes/diario — expedientes agrupados por estado', () => {
    let expedienteIds;

    beforeAll(async () => {
      await limpiarFixtures();
      // Insertar 4 expedientes con 3 estados distintos
      expedienteIds = [];
      const estados = ['ingreso', 'ingreso', 'en_inspeccion', 'plazo_otorgado'];
      for (let i = 0; i < 4; i++) {
        const res = await querySql(
          `INSERT INTO expedientes (fecha, numero_expediente, nombre_apellido, dni, motivo, direccion, estado)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [FECHA_FIXTURES, `TEST-INFORME-EXP-GRP-${SUFIJO}-${i}`, `TEST GRP CONTRIBUYENTE ${i}`, `9999999${i}`, `Motivo agrupado ${i}`, `CALLE TEST INFORME ${100+i}`, estados[i]]
        );
        expedienteIds.push(res.insertId);
      }
    });

    afterAll(async () => {
      await limpiarFixtures();
    });

    test('Devuelve sección expedientes con grupos y subtítulos correctos', async () => {
      const res = await request(app)
        .get(`/api/informes/diario?fecha=${FECHA_FIXTURES}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);

      const narrativo = res.body.data.seccionesNarrativas;
      const porClave = {};
      narrativo.secciones.forEach((s) => { porClave[s.clave] = s; });

      const expedientes = porClave.expedientes;
      expect(expedientes).toBeDefined();
      expect(expedientes.grupos).toBeDefined();
      expect(Array.isArray(expedientes.grupos)).toBe(true);
      expect(expedientes.grupos.length).toBe(3); // ingreso, en_inspeccion, plazo_otorgado

      // Verificar orden y conteos
      expect(expedientes.grupos[0].clave).toBe('ingreso');
      expect(expedientes.grupos[0].subtitulo).toBe('Expedientes ingresados');
      expect(expedientes.grupos[0].totalSeccion).toBe(2);

      expect(expedientes.grupos[1].clave).toBe('en_inspeccion');
      expect(expedientes.grupos[1].subtitulo).toBe('Expedientes en inspección');
      expect(expedientes.grupos[1].totalSeccion).toBe(1);

      expect(expedientes.grupos[2].clave).toBe('plazo_otorgado');
      expect(expedientes.grupos[2].subtitulo).toBe('Expedientes con plazo otorgado');
      expect(expedientes.grupos[2].totalSeccion).toBe(1);

      // Total general de la sección
      expect(expedientes.totalSeccion).toBe(4);

      // totalGeneral del narrativo incluye los 4 expedientes
      expect(narrativo.totalGeneral).toBeGreaterThanOrEqual(4);
    });

    test('Sub-títulos presentes en la narrativa para renderizado', async () => {
      const res = await request(app)
        .get(`/api/informes/diario?fecha=${FECHA_FIXTURES}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      const narrativo = res.body.data.seccionesNarrativas;
      const porClave = {};
      narrativo.secciones.forEach((s) => { porClave[s.clave] = s; });
      const expedientes = porClave.expedientes;

      // Cada grupo tiene items con oraciones formales
      expedientes.grupos.forEach((grupo) => {
        expect(grupo.items).toBeDefined();
        expect(Array.isArray(grupo.items)).toBe(true);
        expect(grupo.items.length).toBe(grupo.totalSeccion);
        grupo.items.forEach((item) => {
          expect(item).toMatch(/^El expediente N°/);
          expect(item).toContain('cuyo estado actual es');
        });
      });
    });
  });

  describe('GET /api/informes/diario — jornada vacía', () => {
    test('Retorna 200 con secciones [] y bloque formal completo (intro/cierre/firma/total 0)', async () => {
      const res = await request(app)
        .get(`/api/informes/diario?fecha=${FECHA_VACIA}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);

      const narrativo = res.body.data.seccionesNarrativas;
      // Pilot feedback 2: día sin registros → NINGUNA sección en la salida.
      expect(narrativo.secciones).toEqual([]);
      expect(narrativo.lineasResumen).toEqual([]);
      // El bloque formal se mantiene intacto.
      expect(narrativo.introduccion.length).toBeGreaterThan(0);
      expect(narrativo.cierre).toBe(
        'Sin otro particular, se eleva el presente informe para su consideración y fines que estime corresponder.'
      );
      expect(narrativo.firma.cargo).toBe('Dirección de Inspección Urbana');
      expect(narrativo.totalGeneral).toBe(0);
      expect(narrativo.fraseTotalGeneral).toBe('Total general de gestiones: 0');
    });
  });
});
