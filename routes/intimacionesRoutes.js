// routes/intimacionesRoutes.js
const express = require('express');
const router = express.Router();
const intimacionesController = require('../controllers/intimacionesController');
const { verifyToken, requireCargaOrAdmin, requireModuloAccess } = require('../middleware/auth');

// Todas las rutas requieren autenticación y acceso al módulo
router.use(verifyToken, requireModuloAccess('intimaciones'));

// GET /api/intimaciones
router.get('/', intimacionesController.obtenerIntimaciones);

// GET /api/intimaciones/:id
router.get('/:id', intimacionesController.obtenerIntimacionPorId);

// POST /api/intimaciones (requiere carga o admin)
router.post('/', requireCargaOrAdmin, intimacionesController.crearIntimacion);

// PUT /api/intimaciones/:id (requiere carga o admin)
router.put('/:id', requireCargaOrAdmin, intimacionesController.actualizarIntimacion);

// DELETE /api/intimaciones/:id (requiere carga o admin)
router.delete('/:id', requireCargaOrAdmin, intimacionesController.eliminarIntimacion);

const upload = require('../middleware/upload');
// POST /api/intimaciones/:id/foto/:tipo (requiere carga o admin)
router.post('/:id/foto/:tipo', requireCargaOrAdmin, upload.single('foto'), intimacionesController.subirFoto);

// DELETE /api/intimaciones/:id/foto/:tipo (requiere carga o admin)
router.delete('/:id/foto/:tipo', requireCargaOrAdmin, intimacionesController.eliminarFoto);

module.exports = router;
