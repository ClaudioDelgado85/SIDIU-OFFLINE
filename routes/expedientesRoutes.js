// routes/expedientesRoutes.js
// Rutas para gestión de expedientes

const express = require('express');
const router = express.Router();
const expedientesController = require('../controllers/expedientesController');
const { verifyToken, requireCargaOrAdmin } = require('../middleware/auth');

// Todas las rutas requieren autenticación
router.use(verifyToken);

// GET /api/expedientes - Obtener todos los expedientes (con filtros opcionales)
// Parámetros query opcionales: estado, fecha_desde, fecha_hasta, dni, nombre, numero_expediente
router.get('/', expedientesController.obtenerExpedientes);

// GET /api/expedientes/estadisticas - Obtener estadísticas
router.get('/estadisticas', expedientesController.obtenerEstadisticas);

// GET /api/expedientes/:id - Obtener un expediente por ID
router.get('/:id', expedientesController.obtenerExpedientePorId);

// POST /api/expedientes - Crear nuevo expediente (requiere rol de carga o admin)
router.post('/', requireCargaOrAdmin, expedientesController.crearExpediente);

// PUT /api/expedientes/:id - Actualizar expediente (requiere rol de carga o admin)
router.put('/:id', requireCargaOrAdmin, expedientesController.actualizarExpediente);

// PATCH /api/expedientes/:id/estado - Cambiar solo el estado (requiere rol de carga o admin)
router.patch('/:id/estado', requireCargaOrAdmin, expedientesController.cambiarEstado);

// DELETE /api/expedientes/:id - Eliminar expediente (requiere rol de carga o admin)
router.delete('/:id', requireCargaOrAdmin, expedientesController.eliminarExpediente);

module.exports = router;
