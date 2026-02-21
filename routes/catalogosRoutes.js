const express = require('express');
const router = express.Router();
const catalogosController = require('../controllers/catalogosController');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

// GET /api/catalogos?categoria=xxx — Opciones activas para selects (todos los roles)
router.get('/', catalogosController.obtenerPorCategoria);

// GET /api/catalogos/categorias — Lista de categorías (admin)
router.get('/categorias', catalogosController.obtenerCategorias);

// GET /api/catalogos/admin/:categoria — Todas las opciones incluidas inactivas (admin)
router.get('/admin/:categoria', catalogosController.obtenerTodasPorCategoria);

// POST /api/catalogos — Crear opción (admin)
router.post('/', catalogosController.crearOpcion);

// PUT /api/catalogos/:id — Editar opción (admin)
router.put('/:id', catalogosController.editarOpcion);

// PUT /api/catalogos/:id/reactivar — Reactivar opción (admin)
router.put('/:id/reactivar', catalogosController.reactivarOpcion);

// DELETE /api/catalogos/:id — Desactivar opción (admin)
router.delete('/:id', catalogosController.eliminarOpcion);

module.exports = router;
