// routes/vendedoresRoutes.js
const express = require('express');
const router = express.Router();
const vendedoresController = require('../controllers/vendedoresController');
const { verifyToken, requireCargaOrAdmin, requireModuloAccess } = require('../middleware/auth');

// Todas las rutas requieren autenticación y acceso al módulo
router.use(verifyToken, requireModuloAccess('vendedores'));

// Estadísticas (debe ir ANTES de /:id)
router.get('/estadisticas', vendedoresController.obtenerEstadisticas);

// Rutas de lectura
router.get('/', vendedoresController.obtenerVendedores);

// Rutas de escritura (requiere carga o admin)
router.post('/', requireCargaOrAdmin, vendedoresController.crearVendedor);
router.put('/:id', requireCargaOrAdmin, vendedoresController.actualizarVendedor);
router.delete('/:id', requireCargaOrAdmin, vendedoresController.eliminarVendedor);

module.exports = router;
