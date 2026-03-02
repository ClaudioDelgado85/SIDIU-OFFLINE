const express = require('express');
const router = express.Router();
const tareasController = require('../controllers/tareasController');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

// GET /api/tareas-diarias?fecha=YYYY-MM-DD — Obtener tareas por fecha
router.get('/', tareasController.obtenerPorFecha);

// POST /api/tareas-diarias — Crear tarea
router.post('/', tareasController.crearTarea);

// PUT /api/tareas-diarias/:id — Actualizar tarea
router.put('/:id', tareasController.actualizarTarea);

// DELETE /api/tareas-diarias/:id — Eliminar tarea
router.delete('/:id', tareasController.eliminarTarea);

module.exports = router;
