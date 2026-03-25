// tests/controllers/infracciones.test.js
const { app, request, loginAsAdmin } = require('../setup');

describe('🚨 Infracciones (/api/infracciones)', () => {
  let token;
  let infraccionTestId;

  beforeAll(async () => {
    token = await loginAsAdmin();
  });

  describe('GET /api/infracciones', () => {
    test('Listar infracciones retorna array válido', async () => {
        const res = await request(app)
            .get('/api/infracciones')
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.pagination).toBeDefined();
    });
  });

  describe('POST /api/infracciones', () => {
    test('Crear infracción con datos obligatorios', async () => {
      const nueva = {
        fecha: new Date().toISOString().substring(0, 10),
        nombre_apellido: 'QA Infraccion Test',
        dni: '12345678',
        numero_acta: `ACTA-QA-${Date.now()}`,
        direccion: 'Av Test 123',
        motivo_infraccion: 'Falta de habilitación'
      };

      const res = await request(app)
        .post('/api/infracciones')
        .set('Authorization', `Bearer ${token}`)
        .send(nueva);

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      
      infraccionTestId = res.body.data.id;
    });

    test('Rechazar creación sin campos obligatorios', async () => {
      const res = await request(app)
        .post('/api/infracciones')
        .set('Authorization', `Bearer ${token}`)
        .send({ nombre_apellido: 'Test Solo' });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('DELETE /api/infracciones/:id', () => {
    test('Eliminar infracción de prueba', async () => {
      if(!infraccionTestId) return;

      const res = await request(app)
        .delete(`/api/infracciones/${infraccionTestId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
