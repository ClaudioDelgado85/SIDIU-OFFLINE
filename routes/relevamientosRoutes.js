// routes/relevamientosRoutes.js
const express = require('express');
const router = express.Router();
const relevamientosController = require('../controllers/relevamientosController');
const { verifyToken, requireCargaOrAdmin, requireModuloAccess } = require('../middleware/auth');

// Todas las rutas requieren autenticación y acceso al módulo
router.use(verifyToken, requireModuloAccess('relevamientos'));

// Estadísticas (debe ir ANTES de /:id)
router.get('/estadisticas', relevamientosController.obtenerEstadisticas);

// Rutas de lectura
router.get('/', relevamientosController.obtenerRelevamientos);
router.get('/:id', relevamientosController.obtenerRelevamientoPorId);

// Rutas de escritura (requiere carga o admin)
router.post('/', requireCargaOrAdmin, relevamientosController.crearRelevamiento);
router.put('/:id', requireCargaOrAdmin, relevamientosController.actualizarRelevamiento);
router.delete('/:id', requireCargaOrAdmin, relevamientosController.eliminarRelevamiento);

module.exports = router;
