// tests/controllers/vendedores.test.js
const { app, request, loginAsAdmin } = require('../setup');

describe('🛒 Vendedores Ambulantes (/api/vendedores)', () => {
  let token;
  let vendedorTestId;

  beforeAll(async () => {
    token = await loginAsAdmin();
  });

  describe('GET /api/vendedores', () => {
    test('Listar vendedores', async () => {
        const res = await request(app)
            .get('/api/vendedores')
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('POST /api/vendedores', () => {
    test('Crear vendedor con datos válidos', async () => {
      const nuevo = {
        fecha_relevamiento: new Date().toISOString().substring(0, 10),
        ubicacion: 'Plaza QA',
        nombre_vendedor: 'Test Vendedor',
        tiene_autorizacion: true
      };

      const res = await request(app)
        .post('/api/vendedores')
        .set('Authorization', `Bearer ${token}`)
        .send(nuevo);

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      vendedorTestId = res.body.data.id;
    });
  });

  describe('GET /api/vendedores/estadisticas', () => {
    test('Obtener estadísticas de vendedores', async () => {
      const res = await request(app)
        .get('/api/vendedores/estadisticas')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.total).toBeDefined();
    });
  });

  describe('DELETE /api/vendedores/:id', () => {
    test('Eliminar vendedor de prueba', async () => {
      if(!vendedorTestId) return;

      const res = await request(app)
        .delete(`/api/vendedores/${vendedorTestId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
