// tests/controllers/reclamos.test.js
// Suite de pruebas para Reclamos

const { app, request, loginAsAdmin } = require('../setup');

describe('📢 Reclamos (/api/reclamos)', () => {
  let token;
  let reclamoTestId;

  beforeAll(async () => {
    token = await loginAsAdmin();
  });

  // ─── LISTAR ──────────────────────────────────────
  describe('GET /api/reclamos', () => {

    test('Listar reclamos retorna array válido y estructura de paginación', async () => {
        const res = await request(app)
            .get('/api/reclamos')
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.pagination).toBeDefined();
    });
  });

  // ─── CREAR ───────────────────────────────────────
  describe('POST /api/reclamos', () => {

    test('Crear reclamo con datos obligatorios', async () => {
      const nuevo = {
        tipo_reclamo: 'baldío',
        descripcion: 'Es un problema de pruebas QA',
        direccion_incidente: 'Calle Falsa 123',
        prioridad: 'alta'
      };

      const res = await request(app)
        .post('/api/reclamos')
        .set('Authorization', `Bearer ${token}`)
        .send(nuevo);

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.numero_reclamo).toBeDefined();

      reclamoTestId = res.body.data.id;
    });

    test('Rechazar creación sin campos obligatorios', async () => {
      const res = await request(app)
        .post('/api/reclamos')
        .set('Authorization', `Bearer ${token}`)
        .send({ prioridad: 'media' }); // Faltan tipo, descripcion y direccion

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── ESTADISTICAS ────────────────────────────────
  describe('GET /api/reclamos/estadisticas', () => {

    test('Obtener estadísticas de reclamos', async () => {
      const res = await request(app)
        .get('/api/reclamos/estadisticas')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.estados).toBeDefined();
      expect(res.body.prioridades).toBeDefined();
    });
  });

  // ─── ELIMINAR ────────────────────────────────────
  describe('DELETE /api/reclamos/:id', () => {

    test('Eliminar reclamo de prueba', async () => {
      if(!reclamoTestId) return;

      const res = await request(app)
        .delete(`/api/reclamos/${reclamoTestId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
