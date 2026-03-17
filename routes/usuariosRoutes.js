// routes/usuariosRoutes.js
// Rutas para gestión de usuarios (solo admin)

const express = require('express');
const router = express.Router();
const usuariosController = require('../controllers/usuariosController');
const { verifyToken, requireAdmin } = require('../middleware/auth');

// Todas las rutas requieren autenticación y rol de admin
router.use(verifyToken, requireAdmin);

// GET /api/usuarios - Obtener todos los usuarios
router.get('/', usuariosController.obtenerUsuarios);

// GET /api/usuarios/:id - Obtener un usuario por ID (incluye permisos)
router.get('/:id', usuariosController.obtenerUsuarioPorId);

// POST /api/usuarios - Crear nuevo usuario
router.post('/', usuariosController.crearUsuario);

// PUT /api/usuarios/:id - Actualizar usuario
router.put('/:id', usuariosController.actualizarUsuario);

// DELETE /api/usuarios/:id - Desactivar usuario
router.delete('/:id', usuariosController.eliminarUsuario);

// PUT /api/usuarios/:id/resetear-password - Resetear contraseña de usuario
router.put('/:id/resetear-password', usuariosController.resetearPassword);

// GET /api/usuarios/:id/permisos - Obtener permisos de módulos
router.get('/:id/permisos', usuariosController.obtenerPermisos);

// PUT /api/usuarios/:id/permisos - Actualizar permisos de módulos
router.put('/:id/permisos', usuariosController.actualizarPermisos);

module.exports = router;
