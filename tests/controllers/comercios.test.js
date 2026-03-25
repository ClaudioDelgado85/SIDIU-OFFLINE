// tests/controllers/comercios.test.js
const { app, request, loginAsAdmin } = require('../setup');

describe('🏪 Comercios (/api/comercios)', () => {
  let token;
  let comercioTestId;

  beforeAll(async () => {
    token = await loginAsAdmin();
  });

  describe('GET /api/comercios', () => {
    test('Listar comercios', async () => {
        const res = await request(app)
            .get('/api/comercios')
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('POST /api/comercios', () => {
    test('Crear comercio con datos válidos', async () => {
      const nuevo = {
        fecha_relevamiento: new Date().toISOString().substring(0, 10),
        direccion_comercial: 'Calle QA 404',
        nombre_propietario: 'Test Propietario',
        rubro: 'Test',
        esta_habilitado: true
      };

      const res = await request(app)
        .post('/api/comercios')
        .set('Authorization', `Bearer ${token}`)
        .send(nuevo);

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      comercioTestId = res.body.data.id;
    });
  });

  describe('GET /api/comercios/estadisticas', () => {
    test('Obtener estadísticas de comercios', async () => {
      const res = await request(app)
        .get('/api/comercios/estadisticas')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.total).toBeDefined();
    });
  });

  describe('DELETE /api/comercios/:id', () => {
    test('Eliminar comercio de prueba', async () => {
      if(!comercioTestId) return;

      const res = await request(app)
        .delete(`/api/comercios/${comercioTestId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
