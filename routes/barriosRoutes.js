// routes/barriosRoutes.js
const express = require('express');
const router = express.Router();
const barriosController = require('../controllers/barriosController');
const { verifyToken, requireCargaOrAdmin, requireModuloAccess } = require('../middleware/auth');

// Todas las rutas requieren autenticación
router.use(verifyToken);

// GET /api/barrios - Lista para selects (todos los roles autenticados)
router.get('/', barriosController.obtenerBarrios);

// Rutas de escritura: requieren carga/admin + acceso al módulo 'catalogos'
router.post('/', requireCargaOrAdmin, requireModuloAccess('catalogos'), barriosController.crearBarrio);
router.put('/:id', requireCargaOrAdmin, requireModuloAccess('catalogos'), barriosController.editarBarrio);
router.delete('/:id', requireCargaOrAdmin, requireModuloAccess('catalogos'), barriosController.eliminarBarrio);

module.exports = router;
