// tests/controllers/auth.test.js
// Suite de pruebas para autenticación y middleware de roles

const { app, request, loginAsAdmin } = require('../setup');

describe('🔐 Autenticación (/api/auth)', () => {

  // ─── LOGIN ───────────────────────────────────────
  describe('POST /api/auth/login', () => {

    test('Login exitoso con credenciales válidas', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ usuario: 'admin', password: 'admin123' });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.usuario).toBeDefined();
      expect(res.body.usuario.rol).toBe('admin_total');
    });

    test('Login rechazado con contraseña incorrecta', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ usuario: 'admin', password: 'wrongpassword' });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });

    test('Login rechazado con usuario inexistente', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ usuario: 'noexiste', password: '123456' });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });

    test('Login rechazado sin datos', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({});

      expect([400, 401]).toContain(res.statusCode);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── VERIFICACIÓN DE TOKEN ───────────────────────
  describe('GET /api/auth/verify', () => {

    test('Token válido retorna datos del usuario', async () => {
      const token = await loginAsAdmin();

      const res = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.usuario).toBeDefined();
    });

    test('Petición sin token es rechazada con 401', async () => {
      const res = await request(app)
        .get('/api/auth/verify');

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });

    test('Token inválido es rechazado con 401', async () => {
      const res = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', 'Bearer token_inventado_12345');

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── PROTECCIÓN DE RUTAS ─────────────────────────
  describe('Protección de rutas (middleware verifyToken)', () => {

    test('Ruta protegida sin token retorna 401', async () => {
      const res = await request(app).get('/api/intimaciones');
      expect(res.statusCode).toBe(401);
    });

    test('Ruta protegida con token válido retorna 200', async () => {
      const token = await loginAsAdmin();

      const res = await request(app)
        .get('/api/intimaciones')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('Ruta de admin (/api/usuarios) rechaza sin token', async () => {
      const res = await request(app).get('/api/usuarios');
      expect(res.statusCode).toBe(401);
    });
  });
});
