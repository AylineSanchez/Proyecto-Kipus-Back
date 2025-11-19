// backend/index.js - AGREGAR ESTAS LÍNEAS
const express = require('express');
const cors = require('cors');
const(Pool) = require("pg");
require('dotenv').config();
const pool = new Pool((
  connectionString: process.env.DATABASE_URL,
  ssl:{
    rejectUnauthorized: false
  }
));
// Importar rutas
const authRoutes = require('./routes/auth');
const ubicacionRoutes = require('./routes/ubicacion');
const comentariosRoutes = require('./routes/comentarios'); 
const valoracionesRoutes = require('./routes/valoraciones');
const viviendaRoutes = require('./routes/vivienda');
const artefactosRoutes = require('./routes/artefactos');
const evaluacionAguaRoutes = require('./routes/evaluacionAgua');
const materialesRoutes = require('./routes/materiales');
const adminRoutes = require('./routes/admin');
const solucionesRoutes = require('./routes/soluciones');
const preciosUnitariosRoutes = require('./routes/precios_unitarios');
const evaluacionesRoutes = require('./routes/evaluaciones');

const app = express();

// Middlewares
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Ruta de salud del servidor
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true,
    message: '✅ Servidor backend funcionando correctamente',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// Ruta para probar la conexión a la base de datos
app.get('/api/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as current_time');
    res.json({ 
      success: true,
      message: '✅ Conexión a PostgreSQL exitosa',
      database: process.env.DB_NAME,
      currentTime: result.rows[0].current_time
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: '❌ Error conectando a PostgreSQL',
      details: error.message 
    });
  }
});

// Registrar rutas
app.use('/api/auth', authRoutes);
app.use('/api/ubicacion', ubicacionRoutes);
app.use('/api/comentarios', comentariosRoutes); 
app.use('/api/valoraciones', valoracionesRoutes);
app.use('/api/vivienda', viviendaRoutes);
app.use('/api/artefactos', artefactosRoutes);
app.use('/api/evaluacion-agua', evaluacionAguaRoutes);
app.use('/api/materiales', materialesRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/soluciones', solucionesRoutes);
app.use('/api/precios-unitarios', preciosUnitariosRoutes);
app.use('/api/evaluaciones', evaluacionesRoutes);


// Ruta de bienvenida ACTUALIZADA
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🚀 Bienvenido a la API de Kipus',
    version: '1.0.0',
    endpoints: {
      auth: {
        registro: 'POST /api/auth/registro',
        login: 'POST /api/auth/login',
        perfil: 'GET /api/auth/perfil',
        solicitarResetPassword: 'POST /api/auth/solicitar-reset-password'
      },
      ubicacion: {
        regiones: 'GET /api/ubicacion/regiones',
        comunas: 'GET /api/ubicacion/comunas/region/:regionId'
      },
      comentarios: {
        crear: 'POST /api/comentarios' // ← AGREGAR ESTA LÍNEA
      },
      valoraciones: {
        crear: 'POST /api/valoraciones',
        estadisticas: 'GET /api/valoraciones/estadisticas',
        miValoracionHoy: 'GET /api/valoraciones/mi-valoracion-hoy'
      },
      system: {
        health: 'GET /api/health',
        testDb: 'GET /api/test-db'
      }
    }
  });
});

// MANEJO DE ERRORES 404 - ACTUALIZADO
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Ruta no encontrada',
    path: req.originalUrl,
    method: req.method,
    availableEndpoints: [
      'GET /',
      'GET /api/health',
      'GET /api/test-db',
      'POST /api/auth/registro',
      'POST /api/auth/login',
      'GET /api/auth/perfil',
      'POST /api/auth/solicitar-reset-password',
      'GET /api/ubicacion/regiones',
      'GET /api/ubicacion/comunas/region/:regionId',
      'POST /api/comentarios' // ← AGREGAR ESTA LÍNEA
    ]
  });
});

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error('Error del servidor:', err);
  
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Token inválido'
    });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Token expirado'
    });
  }

  res.status(500).json({
    success: false,
    error: 'Error interno del servidor',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0' , ()=> {
  console.log('='.repeat(50));
  console.log('🚀 Servidor backend Kipus iniciado');
  console.log('='.repeat(50));
  console.log(`📍 Puerto: ${PORT}`);
  console.log(`🌍 Ambiente: ${process.env.NODE_ENV}`);
  console.log(`📊 Base de datos: ${process.env.DB_NAME}`);
  console.log(`🔗 URL: http://localhost:${PORT}`);
  console.log('='.repeat(50));
  console.log('📋 Endpoints disponibles:');
  console.log('   GET  / → Bienvenida');
  console.log('   GET  /api/health → Estado del servidor');
  console.log('   GET  /api/test-db → Prueba de base de datos');
  console.log('   POST /api/auth/registro → Registrar usuario');
  console.log('   POST /api/auth/login → Iniciar sesión');
  console.log('   GET  /api/auth/perfil → Perfil de usuario');
  console.log('   POST /api/auth/solicitar-reset-password → Reset password');
  console.log('   GET  /api/ubicacion/regiones → Obtener regiones');
  console.log('   GET  /api/ubicacion/comunas/region/:id → Obtener comunas');
  console.log('='.repeat(50));
});

// Manejo graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🔻 Recibida señal de terminación (SIGINT)');
  console.log('⏳ Cerrando servidor gracefulmente...');
  process.exit(0);
});

module.exports = app;
