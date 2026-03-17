// routes/comerciosRoutes.js
const express = require('express');
const router = express.Router();
const comerciosController = require('../controllers/comerciosController');
const { verifyToken, requireCargaOrAdmin, requireModuloAccess } = require('../middleware/auth');

// Todas las rutas requieren autenticación y acceso al módulo
router.use(verifyToken, requireModuloAccess('comercios'));

// Estadísticas (debe ir ANTES de /:id)
router.get('/estadisticas', comerciosController.obtenerEstadisticas);

// Rutas de lectura
router.get('/', comerciosController.obtenerComercios);

// Rutas de escritura (requiere carga o admin)
router.post('/', requireCargaOrAdmin, comerciosController.crearComercio);
router.put('/:id', requireCargaOrAdmin, comerciosController.actualizarComercio);
router.delete('/:id', requireCargaOrAdmin, comerciosController.eliminarComercio);

module.exports = router;
