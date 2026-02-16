// routes/authRoutes.js
// Rutas de autenticación

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken } = require('../middleware/auth');

// POST /api/auth/login - Login de usuario
router.post('/login', authController.login);

// GET /api/auth/verify - Verificar token y obtener datos del usuario actual
router.get('/verify', verifyToken, authController.verificarToken);

// PUT /api/auth/cambiar-password - Cambiar contraseña del usuario actual
router.put('/cambiar-password', verifyToken, authController.cambiarPassword);

module.exports = router;
