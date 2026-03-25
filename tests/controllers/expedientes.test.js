// tests/controllers/expedientes.test.js
// Suite de pruebas para Expedientes

const { app, request, loginAsAdmin } = require('../setup');

describe('📂 Expedientes (/api/expedientes)', () => {
  let token;
  let expedienteTestId;

  beforeAll(async () => {
    token = await loginAsAdmin();
  });

  // ─── LISTAR ──────────────────────────────────────
  describe('GET /api/expedientes', () => {

    test('Listar expedientes retorna array válido', async () => {
        const res = await request(app)
            .get('/api/expedientes')
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.pagination).toBeDefined();
    });

    test('Filtrar expedientes por estado', async () => {
        const res = await request(app)
            .get('/api/expedientes?estado=ingreso')
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        if(res.body.data.length > 0) {
            expect(res.body.data[0].estado).toBe('ingreso');
        }
    });
  });

  // ─── CREAR ───────────────────────────────────────
  describe('POST /api/expedientes', () => {

    test('Crear expediente con datos válidos', async () => {
      const nuevo = {
        fecha: new Date().toISOString().substring(0, 10),
        numero_expediente: `EXP-TEST-${Date.now()}`,
        nombre_apellido: 'Usuario Test Expediente',
        dni: '12345678',
        motivo: 'habilitacion',
        estado: 'ingreso'
      };

      const res = await request(app)
        .post('/api/expedientes')
        .set('Authorization', `Bearer ${token}`)
        .send(nuevo);

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();

      expedienteTestId = res.body.data.id;
    });

    test('Rechazar creación sin campos obligatorios', async () => {
      const res = await request(app)
        .post('/api/expedientes')
        .set('Authorization', `Bearer ${token}`)
        .send({ estado: 'ingreso' }); // Faltan fecha, nro, nombre, etc

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── ACTUALIZAR ──────────────────────────────────
  describe('PATCH /api/expedientes/:id/estado', () => {

    test('Cambiar estado de expediente válido', async () => {
      if(!expedienteTestId) return;

      const res = await request(app)
        .patch(`/api/expedientes/${expedienteTestId}/estado`)
        .set('Authorization', `Bearer ${token}`)
        .send({ estado: 'en_inspeccion' });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.estado).toBe('en_inspeccion');
    });

    test('Rechazar cambio a estado inválido', async () => {
      if(!expedienteTestId) return;

      const res = await request(app)
        .patch(`/api/expedientes/${expedienteTestId}/estado`)
        .set('Authorization', `Bearer ${token}`)
        .send({ estado: 'estado_inventado' });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── ELIMINAR ────────────────────────────────────
  describe('DELETE /api/expedientes/:id', () => {

    test('Eliminar expediente de prueba', async () => {
      if(!expedienteTestId) return;

      const res = await request(app)
        .delete(`/api/expedientes/${expedienteTestId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
