const express = require('express');
const router = express.Router();
const busquedaController = require('../controllers/busquedaController');
const { verifyToken } = require('../middleware/auth');

// Proteger todas las rutas de búsqueda
router.use(verifyToken);

// Búsqueda Global
router.get('/global', busquedaController.buscarGlobal);

module.exports = router;
