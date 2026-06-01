// server.js
// Servidor principal de la aplicación

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const { execFileSync } = require('child_process');
require('dotenv').config();

const shouldUseSqlite = process.env.DB_CLIENT !== 'mysql';
if (shouldUseSqlite && process.env.NODE_ENV !== 'test' && process.env.SKIP_SQLITE_SETUP !== 'true') {
  try {
    execFileSync(process.execPath, [path.join(__dirname, 'scripts', 'setup_sqlite.js')], {
      cwd: __dirname,
      stdio: 'inherit'
    });
  } catch (error) {
    console.error('No se pudo inicializar/verificar la base SQLite local.');
    process.exit(1);
  }
}

const db = require('./config/database');

// Importar rutas
const authRoutes = require('./routes/authRoutes');
const usuariosRoutes = require('./routes/usuariosRoutes');
const expedientesRoutes = require('./routes/expedientesRoutes');

// Crear aplicación Express
const app = express();
const PORT = process.env.PORT || 3000;

// Configurar confianza en el proxy de Render (necesario para el rate-limit)
app.set('trust proxy', 1);

// ============================================
// MIDDLEWARES
// ============================================

// Seguridad con Helmet (deshabilitar CSP para permitir scripts inline del frontend actual)
app.use(helmet({
  contentSecurityPolicy: false
}));

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

// Parser de JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting (prevenir ataques de fuerza bruta) - Resiliente a versiones antiguas de Node en Windows 7
let limiter;
try {
  const rateLimit = require('express-rate-limit');
  limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: process.env.NODE_ENV === 'production' ? 100 : 2000, // 2000 requests localmente para evitar que Cypress colapse por velocidad
    message: 'Demasiadas peticiones desde esta IP, por favor intente más tarde.'
  });
} catch (error) {
  console.log('⚠️ express-rate-limit no es compatible con esta versión de Node.js (Node < 14 en Windows 7). Usando bypass de rate-limit.');
  limiter = (req, res, next) => next();
}

// Logging middleware (sin datos sensibles)
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.use('/api/', limiter);

// Servir archivos estáticos (frontend)
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// ============================================
// RUTAS DE LA API
// ============================================

// Ruta de prueba
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'API del Sistema de Gestión Municipal - Clorinda',
    version: '1.0.0'
  });
});

// Rutas de autenticación
app.use('/api/auth', authRoutes);

// Rutas de usuarios
app.use('/api/usuarios', usuariosRoutes);

// Rutas de expedientes
app.use('/api/expedientes', expedientesRoutes);

// Rutas de intimaciones
// Rutas de intimaciones
const intimacionesRoutes = require('./routes/intimacionesRoutes');
app.use('/api/intimaciones', intimacionesRoutes);

// Rutas de infracciones
const infraccionesRoutes = require('./routes/infraccionesRoutes');
app.use('/api/infracciones', infraccionesRoutes);

// Rutas de reclamos
const reclamosRoutes = require('./routes/reclamosRoutes');
app.use('/api/reclamos', reclamosRoutes);

// Rutas de relevamientos
const relevamientosRoutes = require('./routes/relevamientosRoutes');
app.use('/api/relevamientos', relevamientosRoutes);

// Rutas Dashboard
const dashboardRoutes = require('./routes/dashboardRoutes');
app.use('/api/dashboard', dashboardRoutes);

// Rutas Barrios (catálogo)
const barriosRoutes = require('./routes/barriosRoutes');
app.use('/api/barrios', barriosRoutes);

// Rutas Catálogos (genérico)
const catalogosRoutes = require('./routes/catalogosRoutes');
app.use('/api/catalogos', catalogosRoutes);

// Rutas de búsqueda unificada
const busquedaRoutes = require('./routes/busquedaRoutes');
app.use('/api/busqueda', busquedaRoutes);

// Rutas de comercios
const comerciosRoutes = require('./routes/comerciosRoutes');
app.use('/api/comercios', comerciosRoutes);

// Rutas de vendedores ambulantes
const vendedoresRoutes = require('./routes/vendedoresRoutes');
app.use('/api/vendedores', vendedoresRoutes);

// Rutas de tareas diarias
const tareasRoutes = require('./routes/tareasRoutes');
app.use('/api/tareas-diarias', tareasRoutes);

// Rutas de informes
const informesRoutes = require('./routes/informesRoutes');
app.use('/api/informes', informesRoutes);

// Rutas de auditoría (solo admin)
const auditoriaRoutes = require('./routes/auditoriaRoutes');
app.use('/api/auditoria', auditoriaRoutes);

// Rutas de configuración del sistema
const configuracionRoutes = require('./routes/configuracionRoutes');
app.use('/api/configuracion', configuracionRoutes);

// ============================================
// RUTAS DEL FRONTEND
// ============================================

// Todas las demás rutas sirven el index.html (para SPA routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ============================================
// MANEJO DE ERRORES
// ============================================

// Error 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada'
  });
});

// Error handler general
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Error interno del servidor' : err.message
  });
});

// ============================================
// INICIAR SERVIDOR
// ============================================

const startServer = async () => {
  try {
    // Probar conexión a la base de datos
    const dbConnected = await db.testConnection();

    if (!dbConnected) {
      console.error('No se pudo conectar a la base de datos. Verifique la configuración.');
      process.exit(1);
    }

    // Iniciar servidor
    app.listen(PORT, () => {
      console.log('');
      console.log('╔════════════════════════════════════════════════════════╗');
      console.log('║   Sistema de Gestión Municipal - Clorinda             ║');
      console.log('╚════════════════════════════════════════════════════════╝');
      console.log('');
      console.log(`✓ Servidor corriendo en puerto ${PORT}`);
      console.log(`✓ Entorno: ${process.env.NODE_ENV || 'development'}`);
      console.log(`✓ URL: http://localhost:${PORT}`);
      console.log(`✓ API: http://localhost:${PORT}/api`);
      console.log('');
      console.log('Presiona CTRL+C para detener el servidor');
      console.log('');
    });

  } catch (error) {
    console.error('Error al iniciar el servidor:', error);
    process.exit(1);
  }
};

// Manejar cierre graceful
process.on('SIGTERM', () => {
  console.log('SIGTERM recibido. Cerrando servidor...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\nSIGINT recibido. Cerrando servidor...');
  process.exit(0);
});

// Iniciar servidor solo si NO estamos en modo test (Jest)
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

module.exports = app;
