const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { verifyToken } = require('../middleware/auth');

// Proteger ruta con autenticación
router.use(verifyToken);

// GET /api/dashboard/resumen
router.get('/resumen', dashboardController.obtenerResumenDashboard);

module.exports = router;
