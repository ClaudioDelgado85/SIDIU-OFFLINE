const express = require('express');
const router = express.Router();
const vendedoresController = require('../controllers/vendedoresController');
const { verifyToken } = require('../middleware/auth');

// Proteger todas las rutas con autenticación
router.use(verifyToken);

// Estadísticas (debe ir ANTES de /:id)
router.get('/estadisticas', vendedoresController.obtenerEstadisticas);

// Rutas CRUD
router.get('/', vendedoresController.obtenerVendedores);
router.post('/', vendedoresController.crearVendedor);
router.put('/:id', vendedoresController.actualizarVendedor);
router.delete('/:id', vendedoresController.eliminarVendedor);

module.exports = router;
