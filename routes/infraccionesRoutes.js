// routes/infraccionesRoutes.js
const express = require('express');
const router = express.Router();
const infraccionesController = require('../controllers/infraccionesController');
const authMiddleware = require('../middleware/auth');

// Proteger todas las rutas con autenticación
router.use(authMiddleware.verifyToken);

// Rutas CRUD
router.get('/', infraccionesController.obtenerInfracciones);
router.get('/:id', infraccionesController.obtenerInfraccionPorId);
router.post('/', infraccionesController.crearInfraccion);
router.put('/:id', infraccionesController.actualizarInfraccion);
router.delete('/:id', infraccionesController.eliminarInfraccion);

module.exports = router;
