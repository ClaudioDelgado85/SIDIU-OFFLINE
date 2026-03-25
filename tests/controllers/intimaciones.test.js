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

    test('La última intimación por grupo DNI+dirección NO es reiterada (a menos que sea cumplida/infraccionada)', async () => {
      const res = await request(app)
        .get('/api/intimaciones')
        .set('Authorization', `Bearer ${token}`);

      // Agrupar por DNI+dirección y encontrar la de mayor ID
      const grupos = {};
      res.body.data.forEach(item => {
        const key = `${item.dni}|${item.direccion}`;
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
});
