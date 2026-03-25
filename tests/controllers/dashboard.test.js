// tests/controllers/dashboard.test.js
// Suite de pruebas para Dashboard

const { app, request, loginAsAdmin } = require('../setup');

describe('📊 Dashboard (/api/dashboard)', () => {
  let token;

  beforeAll(async () => {
    token = await loginAsAdmin();
  });

  describe('GET /api/dashboard/resumen', () => {

    test('Obtener resumen retorna estructura completa de KPIs y tablas', async () => {
      const res = await request(app)
        .get('/api/dashboard/resumen')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();

      const data = res.body.data;
      
      // Probar KPIs
      expect(data.kpis).toBeDefined();
      expect(typeof data.kpis.intimaciones_vencidas).toBe('number');
      expect(typeof data.kpis.intimaciones_proximas).toBe('number');
      expect(typeof data.kpis.expedientes_plazo).toBe('number');
      expect(typeof data.kpis.reclamos_pendientes).toBe('number');
      expect(typeof data.kpis.reclamos_proceso).toBe('number');

      // Probar escalamiento y tablas
      expect(Array.isArray(data.escalamiento)).toBe(true);
      expect(data.tablas).toBeDefined();
      expect(Array.isArray(data.tablas.reclamos_prioridad)).toBe(true);
    });

  });
});
