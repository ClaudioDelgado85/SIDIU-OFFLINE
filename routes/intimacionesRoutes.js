// routes/intimacionesRoutes.js
const express = require('express');
const router = express.Router();
const intimacionesController = require('../controllers/intimacionesController');
const authMiddleware = require('../middleware/auth'); // Asumiendo que existe

// Rutas protegidas (requieren autenticación)
// Si no tienes middleware de auth aún, puedes quitar authMiddleware
// pero es recomendable tenerlo.
// Ajusta la ruta del middleware según tu estructura real.

// GET /api/intimaciones
router.get('/', authMiddleware.verifyToken, intimacionesController.obtenerIntimaciones);

// GET /api/intimaciones/:id
router.get('/:id', authMiddleware.verifyToken, intimacionesController.obtenerIntimacionPorId);

// POST /api/intimaciones
router.post('/', authMiddleware.verifyToken, intimacionesController.crearIntimacion);

// PUT /api/intimaciones/:id
router.put('/:id', authMiddleware.verifyToken, intimacionesController.actualizarIntimacion);

// DELETE /api/intimaciones/:id
router.delete('/:id', authMiddleware.verifyToken, intimacionesController.eliminarIntimacion);

const upload = require('../middleware/upload');
// POST /api/intimaciones/:id/foto/:tipo
router.post('/:id/foto/:tipo', authMiddleware.verifyToken, upload.single('foto'), intimacionesController.subirFoto);

// DELETE /api/intimaciones/:id/foto/:tipo
router.delete('/:id/foto/:tipo', authMiddleware.verifyToken, intimacionesController.eliminarFoto);

module.exports = router;
