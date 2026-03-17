// routes/infraccionesRoutes.js
const express = require('express');
const router = express.Router();
const infraccionesController = require('../controllers/infraccionesController');
const { verifyToken, requireCargaOrAdmin, requireModuloAccess } = require('../middleware/auth');

// Todas las rutas requieren autenticación y acceso al módulo
router.use(verifyToken, requireModuloAccess('infracciones'));

// Rutas de lectura (todos los roles con acceso)
router.get('/', infraccionesController.obtenerInfracciones);
router.get('/:id', infraccionesController.obtenerInfraccionPorId);

// Rutas de escritura (requiere carga o admin)
router.post('/', requireCargaOrAdmin, infraccionesController.crearInfraccion);
router.put('/:id', requireCargaOrAdmin, infraccionesController.actualizarInfraccion);
router.delete('/:id', requireCargaOrAdmin, infraccionesController.eliminarInfraccion);

module.exports = router;
