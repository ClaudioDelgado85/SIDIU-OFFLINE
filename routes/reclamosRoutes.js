// routes/reclamosRoutes.js
const express = require('express');
const router = express.Router();
const reclamosController = require('../controllers/reclamosController');
const { verifyToken, requireCargaOrAdmin, requireModuloAccess } = require('../middleware/auth');

// Todas las rutas requieren autenticación y acceso al módulo
router.use(verifyToken, requireModuloAccess('reclamos'));

// Estadísticas (Dashboard)
router.get('/estadisticas', reclamosController.obtenerEstadisticas);

// Rutas de lectura
router.get('/', reclamosController.obtenerReclamos);
router.get('/:id', reclamosController.obtenerReclamoPorId);

// Rutas de escritura (requiere carga o admin)
router.post('/', requireCargaOrAdmin, reclamosController.crearReclamo);
router.put('/:id', requireCargaOrAdmin, reclamosController.actualizarReclamo);
router.delete('/:id', requireCargaOrAdmin, reclamosController.eliminarReclamo);

const upload = require('../middleware/upload');
// Fotos (requiere carga o admin)
router.post('/:id/foto/:tipo', requireCargaOrAdmin, upload.single('foto'), reclamosController.subirFoto);
router.delete('/:id/foto/:tipo', requireCargaOrAdmin, reclamosController.eliminarFoto);

module.exports = router;
