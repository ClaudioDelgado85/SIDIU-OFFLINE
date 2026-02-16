const express = require('express');
const router = express.Router();
const barriosController = require('../controllers/barriosController');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

// GET /api/barrios - Lista para selects (todos los roles)
router.get('/', barriosController.obtenerBarrios);

// POST /api/barrios - Crear (solo admin)
router.post('/', barriosController.crearBarrio);

// PUT /api/barrios/:id - Editar (solo admin)
router.put('/:id', barriosController.editarBarrio);

// DELETE /api/barrios/:id - Desactivar (solo admin)
router.delete('/:id', barriosController.eliminarBarrio);

module.exports = router;
