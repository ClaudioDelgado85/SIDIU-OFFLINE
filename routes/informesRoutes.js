const express = require('express');
const router = express.Router();
const informesController = require('../controllers/informesController');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

// GET /api/informes/diario?fecha=YYYY-MM-DD — Informe diario consolidado
router.get('/diario', informesController.informeDiario);

module.exports = router;
