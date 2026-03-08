const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Crear las carpetas de uploads si no existen
const uploadDirIntimaciones = path.join(__dirname, '../public/uploads/intimaciones');
const uploadDirReclamos = path.join(__dirname, '../public/uploads/reclamos');
if (!fs.existsSync(uploadDirIntimaciones)) {
    fs.mkdirSync(uploadDirIntimaciones, { recursive: true });
}
if (!fs.existsSync(uploadDirReclamos)) {
    fs.mkdirSync(uploadDirReclamos, { recursive: true });
}

// Configuración de almacenamiento
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Detectar módulo desde la URL
        const modulo = req.originalUrl.includes('/reclamos/') ? 'reclamos' : 'intimaciones';
        const destDir = path.join(__dirname, `../public/uploads/${modulo}`);
        if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
        }
        cb(null, destDir);
    },
    filename: function (req, file, cb) {
        // Formato: id_tipo_timestamp.jpg (ej: 45_inicial_167890123.jpg)
        const id = req.params.id;
        const tipo = req.params.tipo || 'foto'; // 'inicial' o 'actual'
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `${id}_${tipo}_${Date.now()}${ext}`);
    }
});

// Filtro para aceptar solo imágenes
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Solo se permiten imágenes (JPG, PNG)'), false);
    }
};

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB máximo (la compresión se hace en frontend)
    },
    fileFilter: fileFilter
});

module.exports = upload;
