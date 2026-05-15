const express = require('express');
const router = express.Router();
const informesController = require('../controllers/informesController');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

// GET /api/informes/diario?fecha=YYYY-MM-DD — Informe diario consolidado
router.get('/diario', informesController.informeDiario);

// GET /api/informes/diario/docx?fecha=YYYY-MM-DD — Descargar Word
router.get('/diario/docx', informesController.exportarDocx);

module.exports = router;
