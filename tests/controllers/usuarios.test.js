// tests/controllers/usuarios.test.js
// Suite de pruebas para gestión de usuarios

const { app, request, loginAsAdmin } = require('../setup');

describe('👥 Usuarios (/api/usuarios)', () => {
  let token;
  let usuarioTestId;

  beforeAll(async () => {
    token = await loginAsAdmin();
  });

  // ─── OBTENER USUARIOS ────────────────────────────
  describe('GET /api/usuarios', () => {

    test('Listar usuarios retorna array válido', async () => {
        const res = await request(app)
            .get('/api/usuarios')
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data.length).toBeGreaterThan(0);
    });
  });

  // ─── CREAR USUARIO ───────────────────────────────
  describe('POST /api/usuarios', () => {

    test('Crear usuario con datos válidos', async () => {
      const nuevoUser = {
        nombre_completo: 'QA Test User',
        usuario: 'qatest',
        email: 'qa@test.com',
        password: 'password123',
        rol: 'carga'
      };

      const res = await request(app)
        .post('/api/usuarios')
        .set('Authorization', `Bearer ${token}`)
        .send(nuevoUser);

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      
      usuarioTestId = res.body.data.id; // Guardamos para borrarlo después
    });

    test('Rechazar creación con usuario/email duplicado', async () => {
      const duplicadoUser = {
        nombre_completo: 'QA Test Duplicado',
        usuario: 'qatest', // Usuario duplicado
        email: 'otro@test.com',
        password: 'password123',
        rol: 'carga'
      };

      const res = await request(app)
        .post('/api/usuarios')
        .set('Authorization', `Bearer ${token}`)
        .send(duplicadoUser);

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/existe/i);
    });

    test('Rechazar creación con rol inválido', async () => {
      const res = await request(app)
        .post('/api/usuarios')
        .set('Authorization', `Bearer ${token}`)
        .send({
            nombre_completo: 'Test',
            usuario: 'test_rol',
            email: 'rol@test.com',
            password: '123',
            rol: 'super_hacker' // Rol no válido
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── ACTUALIZAR / RESETEAR ───────────────────────
  describe('PUT /api/usuarios/:id', () => {

    test('Resetear contraseña rechaza claves cortas', async () => {
      if(!usuarioTestId) return; // Skip si falló la creación

      const res = await request(app)
        .put(`/api/usuarios/${usuarioTestId}/resetear-password`)
        .set('Authorization', `Bearer ${token}`)
        .send({ nueva_password: '123' }); // Muy corta

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    test('Resetear contraseña con clave válida', async () => {
      if(!usuarioTestId) return;

      const res = await request(app)
        .put(`/api/usuarios/${usuarioTestId}/resetear-password`)
        .set('Authorization', `Bearer ${token}`)
        .send({ nueva_password: 'nuevapassword123' });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ─── ELIMINAR ────────────────────────────────────
  describe('DELETE /api/usuarios/:id', () => {

    test('Desactivar usuario de prueba', async () => {
      if(!usuarioTestId) return;

      const res = await request(app)
        .delete(`/api/usuarios/${usuarioTestId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);

      // Limpieza final REAL de base de datos para no dejar basura
      const db = require('../../config/database');
      await db.pool.execute('DELETE FROM auditoria WHERE modulo="usuarios" AND registro_id=?', [usuarioTestId]);
      await db.pool.execute('DELETE FROM permisos_modulos WHERE usuario_id=?', [usuarioTestId]);
      await db.pool.execute('DELETE FROM usuarios WHERE id=?', [usuarioTestId]);
    });
  });
});
