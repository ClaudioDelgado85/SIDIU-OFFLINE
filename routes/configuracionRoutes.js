// routes/configuracionRoutes.js
// Rutas de configuración del sistema — solo admin

const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { verifyToken, requireAdmin } = require('../middleware/auth');

// GET /api/configuracion — Obtener todas las configuraciones (todos los usuarios autenticados)
router.get('/', verifyToken, async (req, res) => {
  try {
    const [config] = await db.pool.execute('SELECT clave, valor, descripcion FROM configuracion_sistema');
    const resultado = {};
    config.forEach(c => { resultado[c.clave] = c.valor; });
    res.json({ success: true, data: resultado });
  } catch (error) {
    console.error('Error al obtener configuración:', error);
    res.status(500).json({ success: false, message: 'Error al obtener configuración.' });
  }
});

// PUT /api/configuracion/:clave — Actualizar una configuración (solo admin)
router.put('/:clave', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { clave } = req.params;
    const { valor } = req.body;

    if (!valor) {
      return res.status(400).json({ success: false, message: 'El valor es requerido.' });
    }

    const [result] = await db.pool.execute(
      'UPDATE configuracion_sistema SET valor = ? WHERE clave = ?',
      [valor, clave]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Configuración no encontrada.' });
    }

    res.json({ success: true, message: 'Configuración actualizada.' });
  } catch (error) {
    console.error('Error al actualizar configuración:', error);
    res.status(500).json({ success: false, message: 'Error al actualizar configuración.' });
  }
});

module.exports = router;
