const express = require('express');
const router = express.Router();
const comerciosController = require('../controllers/comerciosController');
const { verifyToken } = require('../middleware/auth');

// Proteger todas las rutas con autenticación
router.use(verifyToken);

// Estadísticas (debe ir ANTES de /:id)
router.get('/estadisticas', comerciosController.obtenerEstadisticas);

// Rutas CRUD
router.get('/', comerciosController.obtenerComercios);
router.post('/', comerciosController.crearComercio);
router.put('/:id', comerciosController.actualizarComercio);
router.delete('/:id', comerciosController.eliminarComercio);

module.exports = router;
