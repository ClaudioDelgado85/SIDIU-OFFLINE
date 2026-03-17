// routes/auditoriaRoutes.js
// Rutas de auditoría — solo admin

const express = require('express');
const router = express.Router();
const auditoriaController = require('../controllers/auditoriaController');
const { verifyToken, requireAdmin } = require('../middleware/auth');

// Todas las rutas requieren admin
router.use(verifyToken, requireAdmin);

// GET /api/auditoria — Listar registros (paginado, filtrable)
router.get('/', auditoriaController.obtenerRegistros);

// GET /api/auditoria/resumen — Estadísticas de actividad
router.get('/resumen', auditoriaController.obtenerResumen);

// GET /api/auditoria/:id — Detalle de un registro
router.get('/:id', auditoriaController.obtenerDetalle);

module.exports = router;
