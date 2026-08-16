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
});
