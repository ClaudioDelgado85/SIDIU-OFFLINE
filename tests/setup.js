// tests/setup.js
// Configuración compartida para todas las suites de prueba.
// Exporta la instancia de `app` lista para Supertest y helpers comunes.

const request = require('supertest');
const app = require('../server');

// ── Helper: obtener un token JWT válido de admin ──
async function loginAsAdmin() {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ usuario: 'admin', password: 'admin123' });

  if (!res.body.token) {
    throw new Error('No se pudo obtener token de admin. ¿Existe el usuario admin con password admin123?');
  }
  return res.body.token;
}

// ── Helper: obtener un token JWT de un usuario específico ──
async function loginAs(usuario, password) {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ usuario, password });
  return res.body.token || null;
}

module.exports = { app, request, loginAsAdmin, loginAs };
