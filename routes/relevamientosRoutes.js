const express = require('express');
const router = express.Router();
const relevamientosController = require('../controllers/relevamientosController');
const { verifyToken } = require('../middleware/auth');

// Proteger todas las rutas con autenticación
router.use(verifyToken);

// Rutas CRUD
router.get('/', relevamientosController.obtenerRelevamientos);
router.get('/:id', relevamientosController.obtenerRelevamientoPorId);
router.post('/', relevamientosController.crearRelevamiento);
router.put('/:id', relevamientosController.actualizarRelevamiento);
router.delete('/:id', relevamientosController.eliminarRelevamiento);

// Estadísticas
router.get('/estadisticas', relevamientosController.obtenerEstadisticas);

module.exports = router;
