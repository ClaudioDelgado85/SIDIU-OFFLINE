// routes/catalogosRoutes.js
const express = require('express');
const router = express.Router();
const catalogosController = require('../controllers/catalogosController');
const { verifyToken, requireCargaOrAdmin, requireModuloAccess } = require('../middleware/auth');

// Todas las rutas requieren autenticación
router.use(verifyToken);

// GET /api/catalogos?categoria=xxx — Opciones activas para selects (todos los roles)
router.get('/', catalogosController.obtenerPorCategoria);

// GET /api/catalogos/categorias — Lista de categorías (todos los roles)
router.get('/categorias', catalogosController.obtenerCategorias);

// GET /api/catalogos/admin/:categoria — Todas las opciones incluidas inactivas (carga/admin + módulo catalogos)
router.get('/admin/:categoria', requireCargaOrAdmin, requireModuloAccess('catalogos'), catalogosController.obtenerTodasPorCategoria);

// POST /api/catalogos — Crear opción (carga/admin + módulo catalogos)
router.post('/', requireCargaOrAdmin, requireModuloAccess('catalogos'), catalogosController.crearOpcion);

// PUT /api/catalogos/:id — Editar opción (carga/admin + módulo catalogos)
router.put('/:id', requireCargaOrAdmin, requireModuloAccess('catalogos'), catalogosController.editarOpcion);

// PUT /api/catalogos/:id/reactivar — Reactivar opción (carga/admin + módulo catalogos)
router.put('/:id/reactivar', requireCargaOrAdmin, requireModuloAccess('catalogos'), catalogosController.reactivarOpcion);

// DELETE /api/catalogos/:id — Desactivar opción (carga/admin + módulo catalogos)
router.delete('/:id', requireCargaOrAdmin, requireModuloAccess('catalogos'), catalogosController.eliminarOpcion);

module.exports = router;
