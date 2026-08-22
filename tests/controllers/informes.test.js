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
  async function limpiarFixtures() {
    await querySql("DELETE FROM tareas_diarias WHERE titulo LIKE 'TEST-INFORME-%'");
    await querySql("DELETE FROM expedientes WHERE numero_expediente LIKE 'TEST-INFORME-%'");
    await querySql("DELETE FROM infracciones WHERE numero_acta LIKE 'TEST-INFORME-%'");
  }

  // Inserta 1 registro en cada uno de 3 módulos y devuelve sus ids.
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

    return { tareaId: tarea.insertId, expedienteId: expediente.insertId, actaId: acta.insertId };
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

    test('Adjunta seccionesNarrativas con exactamente 8 secciones coherentes', async () => {
      const res = await request(app)
        .get(`/api/informes/diario?fecha=${FECHA_FIXTURES}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);

      const narrativo = res.body.data.seccionesNarrativas;
      expect(narrativo).toBeDefined();

      // (a) Ocho secciones, una por módulo, con la forma del contrato D6.
      expect(narrativo.secciones.length).toBe(8);
      narrativo.secciones.forEach((seccion) => {
        expect(Object.keys(seccion)).toEqual(expect.arrayContaining([
          'clave', 'titulo', 'parrafoResumen', 'items', 'totalSeccion', 'textoVacio'
        ]));
        expect(typeof seccion.parrafoResumen).toBe('string');
        expect(Array.isArray(seccion.items)).toBe(true);
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

  describe('GET /api/informes/diario — jornada vacía', () => {
    test('Retorna 200 con 8 secciones válidas y leyendas de módulo vacío', async () => {
      const res = await request(app)
        .get(`/api/informes/diario?fecha=${FECHA_VACIA}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);

      const narrativo = res.body.data.seccionesNarrativas;
      expect(narrativo.secciones.length).toBe(8);
      narrativo.secciones.forEach((seccion) => {
        expect(seccion.totalSeccion).toBe(0);
        expect(seccion.textoVacio.length).toBeGreaterThan(0);
      });
      expect(narrativo.totalGeneral).toBe(0);
    });
  });
});
