// routes/tareasRoutes.js
const express = require('express');
const router = express.Router();
const tareasController = require('../controllers/tareasController');
const { verifyToken, requireCargaOrAdmin, requireModuloAccess } = require('../middleware/auth');

// Todas las rutas requieren autenticación y acceso al módulo
router.use(verifyToken, requireModuloAccess('tareas'));

// GET /api/tareas-diarias?fecha=YYYY-MM-DD — Obtener tareas por fecha
router.get('/', tareasController.obtenerPorFecha);

// POST /api/tareas-diarias — Crear tarea (requiere carga o admin)
router.post('/', requireCargaOrAdmin, tareasController.crearTarea);

// PUT /api/tareas-diarias/:id — Actualizar tarea (requiere carga o admin)
router.put('/:id', requireCargaOrAdmin, tareasController.actualizarTarea);

// DELETE /api/tareas-diarias/:id — Eliminar tarea (requiere carga o admin)
router.delete('/:id', requireCargaOrAdmin, tareasController.eliminarTarea);

module.exports = router;
