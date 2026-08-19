// tests/controllers/intimaciones.test.js
// Suite de pruebas para el módulo de Intimaciones

const { app, request, loginAsAdmin } = require('../setup');

describe('📋 Intimaciones (/api/intimaciones)', () => {
  let token;

  // Obtener token de admin antes de todos los tests
  beforeAll(async () => {
    token = await loginAsAdmin();
  });

  // ─── LISTAR ──────────────────────────────────────
  describe('GET /api/intimaciones', () => {

    test('Listar intimaciones retorna datos y estadísticas', async () => {
      const res = await request(app)
        .get('/api/intimaciones')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.stats).toBeDefined();
      expect(res.body.pagination).toBeDefined();
    });

    test('Filtrar por tipo funciona correctamente', async () => {
      const res = await request(app)
        .get('/api/intimaciones?tipo=general')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      if (res.body.data.length > 0) {
        res.body.data.forEach(item => {
          expect(item.tipo).toBe('general');
        });
      }
    });

    test('Paginación funciona correctamente', async () => {
      const res = await request(app)
        .get('/api/intimaciones?page=1&limit=5')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.length).toBeLessThanOrEqual(5);
      expect(res.body.pagination.recordsPerPage).toBe(5);
    });
  });

  // ─── LÓGICA DE ESTADOS ───────────────────────────
  describe('Lógica de estados automáticos', () => {

    test('Las intimaciones tienen estado calculado (no null)', async () => {
      const res = await request(app)
        .get('/api/intimaciones')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      const estadosValidos = ['vigente', 'proxima_vencer', 'vencida', 'cumplida', 'reiterada', 'infraccionado'];

      res.body.data.forEach(item => {
        expect(estadosValidos).toContain(item.estado);
      });
    });

    test('La última intimación por grupo (grupo_id) NO es reiterada (a menos que sea cumplida/infraccionada)', async () => {
      const res = await request(app)
        .get('/api/intimaciones')
        .set('Authorization', `Bearer ${token}`);

      // Agrupar por grupo_id (fallback dni|direccion para filas pre-migración) y encontrar la de mayor ID
      const grupos = {};
      res.body.data.forEach(item => {
        const key = item.grupo_id || `${item.dni}|${item.direccion}`;
        if (!grupos[key] || item.id > grupos[key].id) {
          grupos[key] = item;
        }
      });

      // La última de cada grupo no debe ser "reiterada"
      Object.values(grupos).forEach(ultima => {
        if (ultima.estado !== 'cumplida' && ultima.estado !== 'infraccionado') {
          expect(ultima.estado).not.toBe('reiterada');
        }
      });
    });

    test('Las estadísticas suman el total correcto', async () => {
      const res = await request(app)
        .get('/api/intimaciones')
        .set('Authorization', `Bearer ${token}`);

      const stats = res.body.stats;
      const sumaEstados = (stats.vigentes || 0) + (stats.proximas_vencer || 0) +
        (stats.vencidas || 0) + (stats.cumplidas || 0) +
        (stats.reiteradas || 0) + (stats.infraccionados || 0);

      expect(sumaEstados).toBe(stats.total);
    });
  });

  // ─── CREAR ───────────────────────────────────────
  describe('POST /api/intimaciones', () => {

    test('Crear intimación con datos válidos', async () => {
      const nueva = {
        fecha: new Date().toISOString().substring(0, 10),
        tipo: 'general',
        nombre_apellido: 'TEST QA USUARIO',
        dni: '99999999',
        direccion: 'CALLE TEST 123',
        plazo_dias: 3,
        numero_intimacion: 1,
        observaciones: 'Creada por test automatizado - BORRAR'
      };

      const res = await request(app)
        .post('/api/intimaciones')
        .set('Authorization', `Bearer ${token}`)
        .send(nueva);

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.id).toBeDefined();

      // Limpiar: eliminar la intimación de prueba
      if (res.body.data.id) {
        await request(app)
          .delete(`/api/intimaciones/${res.body.data.id}`)
          .set('Authorization', `Bearer ${token}`);
      }
    });

    test('Rechazar creación sin campos obligatorios', async () => {
      const res = await request(app)
        .post('/api/intimaciones')
        .set('Authorization', `Bearer ${token}`)
        .send({ tipo: 'general' }); // Faltan nombre, dni, dirección, fecha

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    test('Rechazar infracción sin número de infracción', async () => {
      const res = await request(app)
        .post('/api/intimaciones')
        .set('Authorization', `Bearer ${token}`)
        .send({
          fecha: new Date().toISOString().substring(0, 10),
          tipo: 'general',
          nombre_apellido: 'TEST INFRACCION',
          dni: '88888888',
          direccion: 'CALLE INFRACCION 456',
          infraccion_realizada: true
          // Falta numero_infraccion → debe rechazar
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── ELIMINAR ────────────────────────────────────
  describe('DELETE /api/intimaciones/:id', () => {

    test('Eliminar intimación inexistente retorna 404', async () => {
      const res = await request(app)
        .delete('/api/intimaciones/999999')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(404);
    });
  });

  // ─── GRUPOS DE INTIMACIONES (grupo_id) ────────────
  describe('Grupos de intimaciones (grupo_id)', () => {

    const auth = () => ({ 'Authorization': `Bearer ${token}` });
    const hoy = () => new Date().toISOString().substring(0, 10);

    // Limpieza defensiva: borra filas creadas por tests con DNI exacto
    async function limpiarPorDni(dni) {
      const res = await request(app)
        .get(`/api/intimaciones?dni=${dni}&limit=50`)
        .set(auth());
      if (res.body.data) {
        for (const item of res.body.data) {
          if (String(item.dni) === String(dni)) {
            await request(app)
              .delete(`/api/intimaciones/${item.id}`)
              .set(auth());
          }
        }
      }
    }

    async function borrarIds(ids) {
      for (const id of ids) {
        await request(app).delete(`/api/intimaciones/${id}`).set(auth());
      }
    }

    test('POST con grupo_id válido → 201, numero=2, mismo grupo; la 1ª pasa a reiterada', async () => {
      const dni = '77777777';
      const base = { fecha: hoy(), tipo: 'general', nombre_apellido: 'TEST GRUPO UNO', dni, direccion: 'CALLE GRUPO 100', plazo_dias: 3 };
      const ids = [];
      try {
        const r1 = await request(app).post('/api/intimaciones').set(auth()).send(base);
        expect(r1.statusCode).toBe(201);
        expect(r1.body.data.grupo_id).toBeTruthy();
        expect(r1.body.data.numero_intimacion).toBe(1);
        ids.push(r1.body.data.id);

        const r2 = await request(app).post('/api/intimaciones').set(auth()).send({ ...base, grupo_id: r1.body.data.grupo_id });
        expect(r2.statusCode).toBe(201);
        expect(r2.body.data.grupo_id).toBe(r1.body.data.grupo_id);
        expect(r2.body.data.numero_intimacion).toBe(2);
        ids.push(r2.body.data.id);

        // La 1ª instancia pasa a 'reiterada' en el listado
        const res = await request(app).get('/api/intimaciones').set(auth());
        const primera = res.body.data.find(i => i.id === r1.body.data.id);
        expect(primera).toBeDefined();
        expect(primera.estado).toBe('reiterada');
        expect(primera.total_instancias_grupo).toBe(2);
      } finally {
        await borrarIds(ids);
        await limpiarPorDni(dni);
      }
    });

    test('Adosamiento sin grupo_id con variante tipográfica de dirección', async () => {
      const dni = '66666666';
      const base = { fecha: hoy(), tipo: 'general', nombre_apellido: 'TEST ADOSA TIPO', dni, plazo_dias: 3 };
      const ids = [];
      try {
        const r1 = await request(app).post('/api/intimaciones').set(auth()).send({ ...base, direccion: 'Calle Adosa 100.' });
        expect(r1.statusCode).toBe(201);
        ids.push(r1.body.data.id);

        const r2 = await request(app).post('/api/intimaciones').set(auth()).send({ ...base, direccion: 'calle adosa 100' });
        expect(r2.statusCode).toBe(201);
        ids.push(r2.body.data.id);

        // Misma dirección normalizada → mismo grupo, numero=2
        expect(r2.body.data.grupo_id).toBe(r1.body.data.grupo_id);
        expect(r2.body.data.numero_intimacion).toBe(2);
      } finally {
        await borrarIds(ids);
        await limpiarPorDni(dni);
      }
    });

    test('POST con grupo_id ajeno → 400', async () => {
      const dniBase = '55555555';
      const dniAjeno = '44444444';
      const base = { fecha: hoy(), tipo: 'general', nombre_apellido: 'TEST GRUPO AJENO', plazo_dias: 3 };
      const ids = [];
      try {
        const r1 = await request(app).post('/api/intimaciones').set(auth()).send({ ...base, dni: dniBase, direccion: 'CALLE AJENA 10' });
        expect(r1.statusCode).toBe(201);
        ids.push(r1.body.data.id);

        const r2 = await request(app).post('/api/intimaciones').set(auth()).send({ ...base, dni: dniAjeno, direccion: 'CALLE AJENA 10', grupo_id: r1.body.data.grupo_id });
        expect(r2.statusCode).toBe(400);
        expect(r2.body.success).toBe(false);
        expect(r2.body.message).toMatch(/no corresponde|no existe/i);
      } finally {
        await borrarIds(ids);
        await limpiarPorDni(dniBase);
        await limpiarPorDni(dniAjeno);
      }
    });

    test('PUT no altera grupo_id ni numero_intimacion (inmutables)', async () => {
      const dni = '77777778';
      const base = { fecha: hoy(), tipo: 'general', nombre_apellido: 'TEST PUT PROTEGIDO', dni, direccion: 'CALLE PUT 50', plazo_dias: 3 };
      const ids = [];
      try {
        const r1 = await request(app).post('/api/intimaciones').set(auth()).send(base);
        expect(r1.statusCode).toBe(201);
        expect(r1.body.data.numero_intimacion).toBe(1);
        ids.push(r1.body.data.id);
        const grupoOriginal = r1.body.data.grupo_id;

        const put = await request(app)
          .put(`/api/intimaciones/${r1.body.data.id}`)
          .set(auth())
          .send({ numero_intimacion: 9, grupo_id: 'GRP-FAKE', observaciones: 'PUT protegido' });
        expect(put.statusCode).toBe(200);

        const res = await request(app).get(`/api/intimaciones/${r1.body.data.id}`).set(auth());
        expect(res.body.data.numero_intimacion).toBe(1);
        expect(res.body.data.grupo_id).toBe(grupoOriginal);
        expect(res.body.data.grupo_id).not.toBe('GRP-FAKE');
      } finally {
        await borrarIds(ids);
        await limpiarPorDni(dni);
      }
    });

    test('Autonumeración sin tope: 3ª instancia con numero=3 y total_instancias_grupo=3', async () => {
      const dni = '77777776';
      const base = { fecha: hoy(), tipo: 'general', nombre_apellido: 'TEST ESCALADO INFINITO', dni, direccion: 'CALLE ESCALADO 1', plazo_dias: 3 };
      const ids = [];
      try {
        const r1 = await request(app).post('/api/intimaciones').set(auth()).send(base);
        expect(r1.statusCode).toBe(201);
        expect(r1.body.data.numero_intimacion).toBe(1);
        ids.push(r1.body.data.id);

        const r2 = await request(app).post('/api/intimaciones').set(auth()).send({ ...base, grupo_id: r1.body.data.grupo_id });
        expect(r2.statusCode).toBe(201);
        expect(r2.body.data.numero_intimacion).toBe(2);
        ids.push(r2.body.data.id);

        // Sin tope de 3: la 3ª instancia se crea sin 400 y se numera 3
        const r3 = await request(app).post('/api/intimaciones').set(auth()).send({ ...base, grupo_id: r1.body.data.grupo_id });
        expect(r3.statusCode).toBe(201);
        expect(r3.body.data.numero_intimacion).toBe(3);
        ids.push(r3.body.data.id);

        const res = await request(app).get('/api/intimaciones').set(auth());
        const items = res.body.data.filter(i => i.grupo_id === r1.body.data.grupo_id);
        expect(items.length).toBe(3);
        items.forEach(i => expect(i.total_instancias_grupo).toBe(3));
      } finally {
        await borrarIds(ids);
        await limpiarPorDni(dni);
      }
    });

    // ─── BÚSQUEDA POR Nº DE GRUPO (grupo_id) ────────────
    describe('Búsqueda por grupo_id', () => {

      test('?busqueda=GRP-... devuelve las intimaciones del grupo (módulo y búsqueda global)', async () => {
        const dni = '77777773';
        const base = { fecha: hoy(), tipo: 'general', nombre_apellido: 'TEST BUSQUEDA GRUPO', dni, direccion: 'CALLE BUSQUEDA 7', plazo_dias: 3 };
        const ids = [];
        try {
          const r1 = await request(app).post('/api/intimaciones').set(auth()).send(base);
          expect(r1.statusCode).toBe(201);
          ids.push(r1.body.data.id);
          const grupo = r1.body.data.grupo_id;
          expect(grupo).toMatch(/^GRP-\d{6}-\d{4}$/);

          const r2 = await request(app).post('/api/intimaciones').set(auth()).send({ ...base, grupo_id: grupo });
          expect(r2.statusCode).toBe(201);
          ids.push(r2.body.data.id);

          // Módulo: búsqueda por el grupo completo (mayúsculas)
          const res = await request(app).get(`/api/intimaciones?busqueda=${grupo}&limit=100`).set(auth());
          expect(res.statusCode).toBe(200);
          const filas = res.body.data.filter(i => ids.includes(i.id));
          expect(filas.length).toBe(2);

          // Módulo: búsqueda por el grupo en minúsculas (UPPER lo tolera)
          const resLower = await request(app).get(`/api/intimaciones?busqueda=${grupo.toLowerCase()}&limit=100`).set(auth());
          expect(resLower.statusCode).toBe(200);
          const filasLower = resLower.body.data.filter(i => ids.includes(i.id));
          expect(filasLower.length).toBe(2);

          // Módulo: búsqueda por parte del grupo (prefijo GRP-YYYYMM)
          const prefijo = grupo.substring(0, 8); // GRP-YYYYMM
          const resPrefijo = await request(app).get(`/api/intimaciones?busqueda=${prefijo}&limit=100`).set(auth());
          expect(resPrefijo.statusCode).toBe(200);
          const filasPrefijo = resPrefijo.body.data.filter(i => ids.includes(i.id));
          expect(filasPrefijo.length).toBe(2);

          // Búsqueda global: devuelve las intimaciones del grupo y expone grupo_id
          const global = await request(app).get(`/api/busqueda/global?q=${grupo}`).set(auth());
          expect(global.statusCode).toBe(200);
          const intimacionesGlobal = global.body.data.filter(i => i.tipo === 'intimacion' && ids.includes(i.id));
          expect(intimacionesGlobal.length).toBe(2);
          intimacionesGlobal.forEach(i => expect(i.grupo_id).toBe(grupo));
        } finally {
          await borrarIds(ids);
          await limpiarPorDni(dni);
        }
      });
    });

    // ─── FILTRO POR Nº DE INTIMACIÓN (total de actas del caso) ────────────
    describe('Filtro ?numero=N por total de actas del caso', () => {

      test('?numero=2 sobre un caso de 2 actas devuelve ambas filas del caso (y nada con otro total)', async () => {
        const dni = '77777774';
        const base = { fecha: hoy(), tipo: 'general', nombre_apellido: 'TEST FILTRO NUMERO', dni, direccion: 'CALLE FILTRO 2', plazo_dias: 3 };
        const ids = [];
        try {
          const r1 = await request(app).post('/api/intimaciones').set(auth()).send(base);
          expect(r1.statusCode).toBe(201);
          expect(r1.body.data.numero_intimacion).toBe(1);
          ids.push(r1.body.data.id);

          const r2 = await request(app).post('/api/intimaciones').set(auth()).send({ ...base, grupo_id: r1.body.data.grupo_id });
          expect(r2.statusCode).toBe(201);
          expect(r2.body.data.numero_intimacion).toBe(2);
          ids.push(r2.body.data.id);

          // El filtro compara total_instancias_grupo (denominador), no numero_intimacion
          const res = await request(app).get('/api/intimaciones?numero=2&limit=100').set(auth());
          expect(res.statusCode).toBe(200);
          const idsCaso = [r1.body.data.id, r2.body.data.id];
          const filasCaso = res.body.data.filter(i => idsCaso.includes(i.id));
          expect(filasCaso.length).toBe(2);
          filasCaso.forEach(i => expect(i.total_instancias_grupo).toBe(2));
          // Ninguna fila devuelta puede tener un total distinto de 2
          res.body.data.forEach(i => expect(i.total_instancias_grupo).toBe(2));
          expect(res.body.stats.total).toBeGreaterThanOrEqual(2);

          // La exportación usa el mismo flujo filtrado
          const exp = await request(app).get('/api/intimaciones?numero=2&exportar=true').set(auth());
          expect(exp.statusCode).toBe(200);
          const filasExp = exp.body.data.filter(i => idsCaso.includes(i.id));
          expect(filasExp.length).toBe(2);
          exp.body.data.forEach(i => expect(i.total_instancias_grupo).toBe(2));
        } finally {
          await borrarIds(ids);
          await limpiarPorDni(dni);
        }
      });

      test('?numero=3 NO devuelve fila #3/2 (caso con 2 actas tras borrado); ?numero=2 SÍ la devuelve', async () => {
        const dni = '77777775';
        const base = { fecha: hoy(), tipo: 'general', nombre_apellido: 'TEST FILTRO BORRADO', dni, direccion: 'CALLE FILTRO 3', plazo_dias: 3 };
        const ids = [];
        try {
          const r1 = await request(app).post('/api/intimaciones').set(auth()).send(base);
          expect(r1.statusCode).toBe(201);
          ids.push(r1.body.data.id);

          const r2 = await request(app).post('/api/intimaciones').set(auth()).send({ ...base, grupo_id: r1.body.data.grupo_id });
          expect(r2.statusCode).toBe(201);
          ids.push(r2.body.data.id);

          const r3 = await request(app).post('/api/intimaciones').set(auth()).send({ ...base, grupo_id: r1.body.data.grupo_id });
          expect(r3.statusCode).toBe(201);
          expect(r3.body.data.numero_intimacion).toBe(3);
          ids.push(r3.body.data.id);

          // Borrar físicamente la intermedia (#2): el caso queda con 2 actas reales
          // (#1 y #3), pero la #3 conserva numero_intimacion = 3 → badge #3/2
          const del = await request(app).delete(`/api/intimaciones/${r2.body.data.id}`).set(auth());
          expect(del.statusCode).toBe(200);

          // Sanity: la fila #3/2 sigue visible en el listado con total_instancias_grupo = 2
          const todo = await request(app).get('/api/intimaciones?limit=200').set(auth());
          const fila32 = todo.body.data.find(i => i.id === r3.body.data.id);
          expect(fila32).toBeDefined();
          expect(fila32.numero_intimacion).toBe(3);
          expect(fila32.total_instancias_grupo).toBe(2);

          // ?numero=3 → NO debe aparecer la fila #3/2 ni la #1 (el caso no tiene 3 actas)
          const filtro3 = await request(app).get('/api/intimaciones?numero=3&limit=200').set(auth());
          expect(filtro3.statusCode).toBe(200);
          expect(filtro3.body.data.find(i => i.id === r3.body.data.id)).toBeUndefined();
          expect(filtro3.body.data.find(i => i.id === r1.body.data.id)).toBeUndefined();
          filtro3.body.data.forEach(i => expect(i.total_instancias_grupo).toBe(3));

          // ?numero=2 → SÍ debe aparecer la fila #3/2 (y la #1): el caso tiene 2 actas
          const filtro2 = await request(app).get('/api/intimaciones?numero=2&limit=200').set(auth());
          expect(filtro2.statusCode).toBe(200);
          const filasCaso = filtro2.body.data.filter(i => i.id === r3.body.data.id || i.id === r1.body.data.id);
          expect(filasCaso.length).toBe(2);
          filtro2.body.data.forEach(i => expect(i.total_instancias_grupo).toBe(2));
        } finally {
          await borrarIds(ids);
          await limpiarPorDni(dni);
        }
      });
    });
  });

      // ─── OTORGAR PLAZO (plazos_intimacion) ──────────
  describe('POST /api/intimaciones/:id/plazo', () => {
    const auth = () => ({ 'Authorization': `Bearer ${token}` });
    const hoy = () => new Date().toISOString().substring(0, 10);
    const db = require('../../config/database');

    // Fecha esperada con el MISMO patrón del backend (fecha + dias * 86400000 ms)
    const fechaSumada = (fecha, dias) =>
      new Date(new Date(fecha).getTime() + dias * 24 * 60 * 60 * 1000).toISOString().substring(0, 10);

    async function crearIntimacion(extra = {}) {
      const base = {
        fecha: hoy(),
        tipo: 'general',
        nombre_apellido: 'TEST PLAZO',
        dni: '77777771',
        direccion: 'CALLE PLAZO 1',
        plazo_dias: 3
      };
      const res = await request(app).post('/api/intimaciones').set(auth()).send({ ...base, ...extra });
      return res;
    }

    async function borrarIds(ids) {
      for (const id of ids) {
        await request(app).delete(`/api/intimaciones/${id}`).set(auth());
      }
    }

    async function querySql(sql, params) {
      const [rows] = await db.pool.execute(sql, params);
      return rows;
    }

    // R1: vigente + plazo 20 → 201; fecha_vencimiento = fecha_otorgamiento + 20 en GET lista
    test('R1: plazo de 20 días a vigente → 201 y vencimiento efectivo extendido', async () => {
      const ids = [];
      try {
        const creada = await crearIntimacion({ dni: '77777771' });
        expect(creada.statusCode).toBe(201);
        ids.push(creada.body.data.id);

        const res = await request(app)
          .post(`/api/intimaciones/${creada.body.data.id}/plazo`)
          .set(auth())
          .send({ dias: 20 });
        expect(res.statusCode).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.plazo).toBeDefined();
        expect(res.body.data.plazo.dias).toBe(20);
        expect(res.body.data.fecha_vencimiento).toBeDefined();

        // En el listado, fecha_vencimiento = fecha_otorgamiento (hoy) + 20
        const lista = await request(app).get('/api/intimaciones?limit=200').set(auth());
        const item = lista.body.data.find(i => i.id === creada.body.data.id);
        expect(item).toBeDefined();
        const esperado = fechaSumada(hoy(), 20);
        expect(String(item.fecha_vencimiento).substring(0, 10)).toBe(esperado);
        expect(item.ultimo_plazo).toBeDefined();
        expect(item.ultimo_plazo.dias).toBe(20);
      } finally {
        await borrarIds(ids);
      }
    });

    // R1: dias ausente/0/negativo → 400 sin insertar (historial vacío vía GET /:id)
    test('R1: dias ausente, 0 o negativo → 400 sin insertar plazo', async () => {
      const ids = [];
      try {
        const creada = await crearIntimacion({ dni: '77777772' });
        expect(creada.statusCode).toBe(201);
        ids.push(creada.body.data.id);

        for (const body of [{}, { dias: 0 }, { dias: -5 }]) {
          const res = await request(app)
            .post(`/api/intimaciones/${creada.body.data.id}/plazo`)
            .set(auth())
            .send(body);
          expect(res.statusCode).toBe(400);
        }

        const detalle = await request(app).get(`/api/intimaciones/${creada.body.data.id}`).set(auth());
        expect(detalle.body.data.plazos).toEqual([]);
      } finally {
        await borrarIds(ids);
      }
    });

    // R1: id inexistente → 404
    test('R1: intimación inexistente → 404 sin insertar', async () => {
      const res = await request(app)
        .post('/api/intimaciones/999999/plazo')
        .set(auth())
        .send({ dias: 15 });
      expect(res.statusCode).toBe(404);
    });

    // R2: segundo plazo vence al primero (fecha_otorgamiento + dias del más reciente)
    test('R2: segundo plazo vence al primero', async () => {
      const ids = [];
      try {
        const creada = await crearIntimacion({ dni: '77777773' });
        expect(creada.statusCode).toBe(201);
        ids.push(creada.body.data.id);

        const p1 = await request(app)
          .post(`/api/intimaciones/${creada.body.data.id}/plazo`)
          .set(auth())
          .send({ dias: 10 });
        expect(p1.statusCode).toBe(201);

        const p2 = await request(app)
          .post(`/api/intimaciones/${creada.body.data.id}/plazo`)
          .set(auth())
          .send({ dias: 30 });
        expect(p2.statusCode).toBe(201);

        const lista = await request(app).get('/api/intimaciones?limit=200').set(auth());
        const item = lista.body.data.find(i => i.id === creada.body.data.id);
        expect(String(item.fecha_vencimiento).substring(0, 10)).toBe(fechaSumada(hoy(), 30));
        expect(item.ultimo_plazo.id).toBe(p2.body.data.plazo.id);

        // Historial conserva ambos (inmutabilidad R2)
        const detalle = await request(app).get(`/api/intimaciones/${creada.body.data.id}`).set(auth());
        expect(detalle.body.data.plazos.length).toBe(2);
        expect(detalle.body.data.plazos[0].id).toBe(p2.body.data.plazo.id); // orden DESC
      } finally {
        await borrarIds(ids);
      }
    });

    // R2: desempate por id — dos plazos con igual fecha_otorgamiento → gana el mayor id
    test('R2: desempate por id con igual fecha_otorgamiento → gana el mayor id', async () => {
      const ids = [];
      try {
        const creada = await crearIntimacion({ dni: '77777774' });
        expect(creada.statusCode).toBe(201);
        ids.push(creada.body.data.id);

        const p1 = await request(app)
          .post(`/api/intimaciones/${creada.body.data.id}/plazo`)
          .set(auth())
          .send({ dias: 10 });
        const p2 = await request(app)
          .post(`/api/intimaciones/${creada.body.data.id}/plazo`)
          .set(auth())
          .send({ dias: 25 });

        // Forzar igual fecha_otorgamiento (UPDATE directo del 1º) → gana mayor id (p2)
        await querySql(
          'UPDATE plazos_intimacion SET fecha_otorgamiento = ? WHERE id = ?',
          [hoy(), p1.body.data.plazo.id]
        );

        const lista = await request(app).get('/api/intimaciones?limit=200').set(auth());
        const item = lista.body.data.find(i => i.id === creada.body.data.id);
        expect(item.ultimo_plazo.id).toBe(p2.body.data.plazo.id);
        expect(String(item.fecha_vencimiento).substring(0, 10)).toBe(fechaSumada(hoy(), 25));
      } finally {
        await borrarIds(ids);
      }
    });

    // R3: sin plazos → fecha_vencimiento = fecha + plazo_dias (regresión)
    test('R3: sin plazos el vencimiento efectivo = fecha + plazo_dias (regresión)', async () => {
      const ids = [];
      try {
        const creada = await crearIntimacion({ dni: '77777775', fecha: hoy(), plazo_dias: 15 });
        expect(creada.statusCode).toBe(201);
        ids.push(creada.body.data.id);

        const lista = await request(app).get('/api/intimaciones?limit=200').set(auth());
        const item = lista.body.data.find(i => i.id === creada.body.data.id);
        expect(item.ultimo_plazo).toBeNull();
        expect(String(item.fecha_vencimiento).substring(0, 10)).toBe(fechaSumada(hoy(), 15));
      } finally {
        await borrarIds(ids);
      }
    });

    // R4: vencida (fecha −30d) + plazo 20 → estado calculado vigente; estado BD intacto
    test('R4: vencida con plazo de 20 días → estado calculado vigente sin tocar BD', async () => {
      const ids = [];
      try {
        const hace30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10);
        const creada = await crearIntimacion({ dni: '77777776', fecha: hace30, plazo_dias: 3 });
        expect(creada.statusCode).toBe(201);
        ids.push(creada.body.data.id);

        // Sanity: calculada como vencida sin plazos
        const antes = await request(app).get('/api/intimaciones?limit=200').set(auth());
        expect(antes.body.data.find(i => i.id === creada.body.data.id).estado).toBe('vencida');

        // Forzar estado persistido 'vencida' para verificar que el POST no lo toca
        await querySql("UPDATE intimaciones SET estado = 'vencida' WHERE id = ?", [creada.body.data.id]);

        const res = await request(app)
          .post(`/api/intimaciones/${creada.body.data.id}/plazo`)
          .set(auth())
          .send({ dias: 20 });
        expect(res.statusCode).toBe(201);
        expect(res.body.data.estado).toBe('vigente');

        const lista = await request(app).get('/api/intimaciones?limit=200').set(auth());
        expect(lista.body.data.find(i => i.id === creada.body.data.id).estado).toBe('vigente');

        // estado en BD sigue 'vencida' (nunca se escribe)
        const fila = await querySql('SELECT estado FROM intimaciones WHERE id = ?', [creada.body.data.id]);
        expect(fila[0].estado).toBe('vencida');
      } finally {
        await borrarIds(ids);
      }
    });

    // R4: plazo corto (2 días) sobre vencida → proxima_vencer
    test('R4: plazo corto de 2 días sobre vencida → proxima_vencer', async () => {
      const ids = [];
      try {
        const hace30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10);
        const creada = await crearIntimacion({ dni: '77777777', fecha: hace30, plazo_dias: 3 });
        expect(creada.statusCode).toBe(201);
        ids.push(creada.body.data.id);

        const res = await request(app)
          .post(`/api/intimaciones/${creada.body.data.id}/plazo`)
          .set(auth())
          .send({ dias: 2 });
        expect(res.statusCode).toBe(201);
        expect(res.body.data.estado).toBe('proxima_vencer');
      } finally {
        await borrarIds(ids);
      }
    });

    // R8: vencida sin plazo sigue vencida (regresión)
    test('R8: vencida sin plazo sigue vencida', async () => {
      const ids = [];
      try {
        const hace30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10);
        const creada = await crearIntimacion({ dni: '77777778', fecha: hace30, plazo_dias: 3 });
        expect(creada.statusCode).toBe(201);
        ids.push(creada.body.data.id);

        const lista = await request(app).get('/api/intimaciones?limit=200').set(auth());
        expect(lista.body.data.find(i => i.id === creada.body.data.id).estado).toBe('vencida');
      } finally {
        await borrarIds(ids);
      }
    });

    // R5: dio_cumplimiento=true (PUT) → POST plazo → 400
    test('R5: plazo sobre cumplida (dio_cumplimiento=1) → 400 sin insertar', async () => {
      const ids = [];
      try {
        const creada = await crearIntimacion({ dni: '77777779' });
        expect(creada.statusCode).toBe(201);
        ids.push(creada.body.data.id);

        await request(app)
          .put(`/api/intimaciones/${creada.body.data.id}`)
          .set(auth())
          .send({ dio_cumplimiento: true });

        const res = await request(app)
          .post(`/api/intimaciones/${creada.body.data.id}/plazo`)
          .set(auth())
          .send({ dias: 15 });
        expect(res.statusCode).toBe(400);

        const detalle = await request(app).get(`/api/intimaciones/${creada.body.data.id}`).set(auth());
        expect(detalle.body.data.plazos).toEqual([]);
      } finally {
        await borrarIds(ids);
      }
    });

    // R5: reiterada (1ª instancia de grupo de 2) → 400
    test('R5: plazo sobre reiterada → 400 sin insertar', async () => {
      const ids = [];
      try {
        const base = { fecha: hoy(), tipo: 'general', nombre_apellido: 'TEST PLAZO REITERADA', dni: '77777780', direccion: 'CALLE REITERADA 1', plazo_dias: 3 };
        const r1 = await request(app).post('/api/intimaciones').set(auth()).send(base);
        expect(r1.statusCode).toBe(201);
        ids.push(r1.body.data.id);

        const r2 = await request(app).post('/api/intimaciones').set(auth()).send({ ...base, grupo_id: r1.body.data.grupo_id });
        expect(r2.statusCode).toBe(201);
        ids.push(r2.body.data.id);

        // Sanity: la 1ª es reiterada en el listado
        const lista = await request(app).get('/api/intimaciones?limit=200').set(auth());
        expect(lista.body.data.find(i => i.id === r1.body.data.id).estado).toBe('reiterada');

        const res = await request(app)
          .post(`/api/intimaciones/${r1.body.data.id}/plazo`)
          .set(auth())
          .send({ dias: 15 });
        expect(res.statusCode).toBe(400);
      } finally {
        await borrarIds(ids);
      }
    });

    // R5: infraccionado → 400
    test('R5: plazo sobre infraccionado → 400 sin insertar', async () => {
      const ids = [];
      try {
        const creada = await crearIntimacion({
          dni: '77777781',
          infraccion_realizada: true,
          numero_infraccion: 'INF-PLAZO-TEST'
        });
        expect(creada.statusCode).toBe(201);
        expect(creada.body.data.estado).toBe('infraccionado');
        ids.push(creada.body.data.id);

        const res = await request(app)
          .post(`/api/intimaciones/${creada.body.data.id}/plazo`)
          .set(auth())
          .send({ dias: 15 });
        expect(res.statusCode).toBe(400);
      } finally {
        await borrarIds(ids);
      }
    });

    // R5 caso límite: estado persistido 'vigente' + dio_cumplimiento=1 (UPDATE directo) → 400
    test('R5: estado persistido vigente con dio_cumplimiento=1 → 400 (usa estado calculado)', async () => {
      const ids = [];
      try {
        const creada = await crearIntimacion({ dni: '77777782' });
        expect(creada.statusCode).toBe(201);
        ids.push(creada.body.data.id);

        await querySql(
          "UPDATE intimaciones SET estado = 'vigente', dio_cumplimiento = 1 WHERE id = ?",
          [creada.body.data.id]
        );

        const res = await request(app)
          .post(`/api/intimaciones/${creada.body.data.id}/plazo`)
          .set(auth())
          .send({ dias: 15 });
        expect(res.statusCode).toBe(400);
      } finally {
        await borrarIds(ids);
      }
    });

    // R6: sin motivo ni usuario → motivo NULL, usuario del token
    test('R6: {dias} sin motivo → motivo NULL y usuario del token', async () => {
      const ids = [];
      try {
        const creada = await crearIntimacion({ dni: '77777783' });
        expect(creada.statusCode).toBe(201);
        ids.push(creada.body.data.id);

        const res = await request(app)
          .post(`/api/intimaciones/${creada.body.data.id}/plazo`)
          .set(auth())
          .send({ dias: 15 });
        expect(res.statusCode).toBe(201);
        expect(res.body.data.plazo.motivo).toBeNull();
        expect(res.body.data.plazo.usuario).toBe('admin');
      } finally {
        await borrarIds(ids);
      }
    });

    // R6: con motivo y usuario → persiste ambos
    test('R6: {dias, motivo} → persiste motivo y usuario', async () => {
      const ids = [];
      try {
        const creada = await crearIntimacion({ dni: '77777784' });
        expect(creada.statusCode).toBe(201);
        ids.push(creada.body.data.id);

        const res = await request(app)
          .post(`/api/intimaciones/${creada.body.data.id}/plazo`)
          .set(auth())
          .send({ dias: 15, motivo: 'Trámite en curso' });
        expect(res.statusCode).toBe(201);
        expect(res.body.data.plazo.motivo).toBe('Trámite en curso');
        expect(res.body.data.plazo.usuario).toBe('admin');
      } finally {
        await borrarIds(ids);
      }
    });

    // R1: grupo y fecha de emisión intactos; sin acta nueva (grupo_id/numero_intimacion/fecha)
    test('R1: grupo_id, numero_intimacion y fecha intactos tras otorgar plazo', async () => {
      const ids = [];
      try {
        const creada = await crearIntimacion({ dni: '77777785', fecha: '2026-01-15' });
        expect(creada.statusCode).toBe(201);
        ids.push(creada.body.data.id);
        const { grupo_id, numero_intimacion, fecha } = creada.body.data;

        const res = await request(app)
          .post(`/api/intimaciones/${creada.body.data.id}/plazo`)
          .set(auth())
          .send({ dias: 20 });
        expect(res.statusCode).toBe(201);

        const detalle = await request(app).get(`/api/intimaciones/${creada.body.data.id}`).set(auth());
        expect(detalle.body.data.grupo_id).toBe(grupo_id);
        expect(detalle.body.data.numero_intimacion).toBe(numero_intimacion);
        expect(detalle.body.data.fecha.substring(0, 10)).toBe(fecha.substring(0, 10));
        expect(detalle.body.data.estado).not.toBe('reiterada');
      } finally {
        await borrarIds(ids);
      }
    });

    // 2.6: DELETE de intimación con plazos → sin huérfanos (CASCADE)
    test('DELETE cascada: borrar intimación elimina sus plazos', async () => {
      const creada = await crearIntimacion({ dni: '77777786' });
      expect(creada.statusCode).toBe(201);
      const id = creada.body.data.id;

      const res = await request(app)
        .post(`/api/intimaciones/${id}/plazo`)
        .set(auth())
        .send({ dias: 15 });
      expect(res.statusCode).toBe(201);

      const antes = await querySql('SELECT COUNT(*) AS c FROM plazos_intimacion WHERE intimacion_id = ?', [id]);
      expect(antes[0].c).toBe(1);

      const del = await request(app).delete(`/api/intimaciones/${id}`).set(auth());
      expect(del.statusCode).toBe(200);

      const despues = await querySql('SELECT COUNT(*) AS c FROM plazos_intimacion WHERE intimacion_id = ?', [id]);
      expect(despues[0].c).toBe(0);
    });

    // R9: carga retroactiva — fecha pasada → 201 y fecha_otorgamiento persistida tal cual
    test('R9: fecha pasada {dias:10, fecha_otorgamiento:"2026-08-15"} → 201 y fecha persistida', async () => {
      const ids = [];
      try {
        const creada = await crearIntimacion({ dni: '77777787' });
        expect(creada.statusCode).toBe(201);
        ids.push(creada.body.data.id);

        const res = await request(app)
          .post(`/api/intimaciones/${creada.body.data.id}/plazo`)
          .set(auth())
          .send({ dias: 10, fecha_otorgamiento: '2026-08-15' });
        expect(res.statusCode).toBe(201);
        expect(res.body.data.plazo.fecha_otorgamiento).toBe('2026-08-15');

        // Persistida en BD: verificable vía GET /:id (plazos[0] por orden DESC)
        const detalle = await request(app).get(`/api/intimaciones/${creada.body.data.id}`).set(auth());
        expect(detalle.body.data.plazos[0].fecha_otorgamiento).toBe('2026-08-15');
      } finally {
        await borrarIds(ids);
      }
    });

    // R9: adelanto — fecha futura → 201 y vencimiento efectivo = fecha_otorgamiento + dias
    test('R9: fecha futura {dias:30, fecha_otorgamiento:"2026-09-01"} → vencimiento = fecha+30d', async () => {
      const ids = [];
      try {
        const creada = await crearIntimacion({ dni: '77777788' });
        expect(creada.statusCode).toBe(201);
        ids.push(creada.body.data.id);

        const res = await request(app)
          .post(`/api/intimaciones/${creada.body.data.id}/plazo`)
          .set(auth())
          .send({ dias: 30, fecha_otorgamiento: '2026-09-01' });
        expect(res.statusCode).toBe(201);
        expect(res.body.data.plazo.fecha_otorgamiento).toBe('2026-09-01');

        // En el listado, fecha_vencimiento = fecha_otorgamiento (2026-09-01) + 30
        const lista = await request(app).get('/api/intimaciones?limit=200').set(auth());
        const item = lista.body.data.find(i => i.id === creada.body.data.id);
        expect(item).toBeDefined();
        expect(String(item.fecha_vencimiento).substring(0, 10)).toBe(fechaSumada('2026-09-01', 30));
        expect(item.ultimo_plazo.fecha_otorgamiento).toBe('2026-09-01');
      } finally {
        await borrarIds(ids);
      }
    });

    // R9: fecha por defecto = hoy
    test('R9: sin fecha_otorgamiento → se persiste la fecha actual (hoy)', async () => {
      const ids = [];
      try {
        const creada = await crearIntimacion({ dni: '77777789' });
        expect(creada.statusCode).toBe(201);
        ids.push(creada.body.data.id);

        const res = await request(app)
          .post(`/api/intimaciones/${creada.body.data.id}/plazo`)
          .set(auth())
          .send({ dias: 15 });
        expect(res.statusCode).toBe(201);
        expect(res.body.data.plazo.fecha_otorgamiento).toBe(hoy());

        const detalle = await request(app).get(`/api/intimaciones/${creada.body.data.id}`).set(auth());
        expect(detalle.body.data.plazos[0].fecha_otorgamiento).toBe(hoy());
      } finally {
        await borrarIds(ids);
      }
    });

    // R9: formato inválido → 400 sin insertar (historial vacío vía GET /:id)
    test('R9: fecha_otorgamiento inválida ("15-08-2026", "no-es-fecha") → 400 sin insertar', async () => {
      const ids = [];
      try {
        const creada = await crearIntimacion({ dni: '77777790' });
        expect(creada.statusCode).toBe(201);
        ids.push(creada.body.data.id);

        for (const fechaInvalida of ['15-08-2026', 'no-es-fecha']) {
          const res = await request(app)
            .post(`/api/intimaciones/${creada.body.data.id}/plazo`)
            .set(auth())
            .send({ dias: 10, fecha_otorgamiento: fechaInvalida });
          expect(res.statusCode).toBe(400);
        }

        const detalle = await request(app).get(`/api/intimaciones/${creada.body.data.id}`).set(auth());
        expect(detalle.body.data.plazos).toEqual([]);
      } finally {
        await borrarIds(ids);
      }
    });
  });

  // ─── R10: FILTRO "CON PLAZO" (REV 4) ─────────────────
  // ?con_plazo=1 → only intimations with at least one granted plazo;
  // ?con_plazo=0 → only those without any plazo. Combines with the existing
  // in-memory filters (estado, numero, busqueda) via logical AND.
  describe('Filtro ?con_plazo (R10)', () => {
    const auth = () => ({ 'Authorization': `Bearer ${token}` });
    const hoy = () => new Date().toISOString().substring(0, 10);

    // Local replica of the plazo-describe helper (not in scope here) with a
    // distinct DNI range (7777780x) to avoid collisions with other tests.
    async function crearIntimacion(extra = {}) {
      const base = {
        fecha: hoy(),
        tipo: 'general',
        nombre_apellido: 'TEST CON PLAZO',
        dni: '77777800',
        direccion: 'CALLE CON PLAZO 1',
        plazo_dias: 3
      };
      const res = await request(app).post('/api/intimaciones').set(auth()).send({ ...base, ...extra });
      return res;
    }

    async function borrarIds(ids) {
      for (const id of ids) {
        await request(app).delete(`/api/intimaciones/${id}`).set(auth());
      }
    }

    // R10 (a) + (c): mixed list — ?con_plazo=1 → only rows WITH a plazo,
    // ?con_plazo=0 → only rows WITHOUT; no parameter → both appear (regression).
    test('R10: con_plazo=1 / con_plazo=0 on mixed list; no parameter keeps both (regression)', async () => {
      const ids = [];
      try {
        const conPlazo = await crearIntimacion({ dni: '77777801' });
        expect(conPlazo.statusCode).toBe(201);
        ids.push(conPlazo.body.data.id);

        const sinPlazo = await crearIntimacion({ dni: '77777802', plazo_dias: 10 });
        expect(sinPlazo.statusCode).toBe(201);
        ids.push(sinPlazo.body.data.id);

        // Grant a plazo ONLY to the first one
        const otorgar = await request(app)
          .post(`/api/intimaciones/${conPlazo.body.data.id}/plazo`)
          .set(auth())
          .send({ dias: 10 });
        expect(otorgar.statusCode).toBe(201);

        // con_plazo=1 → only the row with a plazo; every returned row has one
        const con = await request(app).get('/api/intimaciones?con_plazo=1&limit=200').set(auth());
        expect(con.statusCode).toBe(200);
        const idsCon = con.body.data.map(i => i.id);
        expect(idsCon).toContain(conPlazo.body.data.id);
        expect(idsCon).not.toContain(sinPlazo.body.data.id);
        con.body.data.forEach(i => expect(i.ultimo_plazo).toBeTruthy());

        // con_plazo=0 → only the row without a plazo; no returned row has one
        const sin = await request(app).get('/api/intimaciones?con_plazo=0&limit=200').set(auth());
        expect(sin.statusCode).toBe(200);
        const idsSin = sin.body.data.map(i => i.id);
        expect(idsSin).toContain(sinPlazo.body.data.id);
        expect(idsSin).not.toContain(conPlazo.body.data.id);
        sin.body.data.forEach(i => expect(i.ultimo_plazo).toBeFalsy());

        // No parameter → identical to pre-change behavior: both appear
        const todas = await request(app).get('/api/intimaciones?limit=200').set(auth());
        expect(todas.statusCode).toBe(200);
        const idsTodas = todas.body.data.map(i => i.id);
        expect(idsTodas).toContain(conPlazo.body.data.id);
        expect(idsTodas).toContain(sinPlazo.body.data.id);
      } finally {
        await borrarIds(ids);
      }
    });

    // R10 (b): combination with estado — both fixtures end up 'vigente'
    // (fecha hoy + 10d); estado=vigente&con_plazo=1 → the one WITH plazo;
    // estado=vigente&con_plazo=0 → the one WITHOUT.
    test('R10: combination con_plazo=1/0 with estado=vigente (logical AND)', async () => {
      const ids = [];
      try {
        const conPlazo = await crearIntimacion({ dni: '77777803' });
        expect(conPlazo.statusCode).toBe(201);
        ids.push(conPlazo.body.data.id);

        const sinPlazo = await crearIntimacion({ dni: '77777804', plazo_dias: 10 });
        expect(sinPlazo.statusCode).toBe(201);
        ids.push(sinPlazo.body.data.id);

        const otorgar = await request(app)
          .post(`/api/intimaciones/${conPlazo.body.data.id}/plazo`)
          .set(auth())
          .send({ dias: 10 });
        expect(otorgar.statusCode).toBe(201);

        const res1 = await request(app).get('/api/intimaciones?estado=vigente&con_plazo=1&limit=200').set(auth());
        expect(res1.statusCode).toBe(200);
        const ids1 = res1.body.data.map(i => i.id);
        expect(ids1).toContain(conPlazo.body.data.id);
        expect(ids1).not.toContain(sinPlazo.body.data.id);

        const res0 = await request(app).get('/api/intimaciones?estado=vigente&con_plazo=0&limit=200').set(auth());
        expect(res0.statusCode).toBe(200);
        const ids0 = res0.body.data.map(i => i.id);
        expect(ids0).toContain(sinPlazo.body.data.id);
        expect(ids0).not.toContain(conPlazo.body.data.id);
      } finally {
        await borrarIds(ids);
      }
    });

    // R10 (d): combination with busqueda — ?con_plazo=1&busqueda=<dni> → only
    // the row matching the search AND having a plazo.
    test('R10: combination con_plazo=1 with busqueda by DNI (logical AND)', async () => {
      const ids = [];
      try {
        const conPlazo = await crearIntimacion({ dni: '77777805' });
        expect(conPlazo.statusCode).toBe(201);
        ids.push(conPlazo.body.data.id);

        const sinPlazo = await crearIntimacion({ dni: '77777806', plazo_dias: 10 });
        expect(sinPlazo.statusCode).toBe(201);
        ids.push(sinPlazo.body.data.id);

        const otorgar = await request(app)
          .post(`/api/intimaciones/${conPlazo.body.data.id}/plazo`)
          .set(auth())
          .send({ dias: 10 });
        expect(otorgar.statusCode).toBe(201);

        const res = await request(app).get('/api/intimaciones?con_plazo=1&busqueda=77777805&limit=200').set(auth());
        expect(res.statusCode).toBe(200);
        const idsRes = res.body.data.map(i => i.id);
        expect(idsRes).toContain(conPlazo.body.data.id);
        expect(idsRes).not.toContain(sinPlazo.body.data.id);
        res.body.data.forEach(i => expect(i.ultimo_plazo).toBeTruthy());
      } finally {
        await borrarIds(ids);
      }
    });
  });
});
