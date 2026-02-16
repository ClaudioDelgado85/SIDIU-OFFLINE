// routes/reclamosRoutes.js
const express = require('express');
const router = express.Router();
const reclamosController = require('../controllers/reclamosController');
const authMiddleware = require('../middleware/auth');

// Proteger rutas
router.use(authMiddleware.verifyToken);

// Estadísticas (Dashboard)
router.get('/estadisticas', reclamosController.obtenerEstadisticas);

// CRUD
router.get('/', reclamosController.obtenerReclamos);
router.get('/:id', reclamosController.obtenerReclamoPorId);
router.post('/', reclamosController.crearReclamo);
router.put('/:id', reclamosController.actualizarReclamo);
router.delete('/:id', reclamosController.eliminarReclamo);

module.exports = router;
