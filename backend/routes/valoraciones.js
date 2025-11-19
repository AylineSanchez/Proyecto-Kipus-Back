// backend/routes/valoraciones.js
const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const jwt = require('jsonwebtoken');

// Middleware de autenticación
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false,
        error: 'Token no proporcionado' 
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secreto-desarrollo');
      req.user = decoded;
    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        error: 'Token inválido o expirado'
      });
    }

    next();
  } catch (error) {
    return res.status(401).json({ 
      success: false,
      error: 'Error de autenticación' 
    });
  }
};

// POST /api/valoraciones - Crear nueva valoración
router.post('/', authMiddleware, async (req, res) => {
  let client;
  try {
    const { puntuacion, feedback } = req.body;
    const id_usuario = req.user.userId;

    console.log('⭐ Recibiendo valoración:', { 
      puntuacion, 
      feedback,
      id_usuario
    });

    // Validar datos
    if (!puntuacion || puntuacion < 1 || puntuacion > 5) {
      return res.status(400).json({
        success: false,
        error: 'La puntuación debe estar entre 1 y 5 estrellas'
      });
    }

    if (!feedback || feedback.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'El feedback es obligatorio'
      });
    }

    // Obtener cliente de la pool
    client = await pool.connect();

    // Verificar que el usuario existe
    const usuarioCheck = await client.query(
      'SELECT id FROM usuario WHERE id = $1',
      [id_usuario]
    );

    if (usuarioCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    // Verificar si el usuario ya ha enviado una valoración hoy
    const valoracionHoy = await client.query(
      'SELECT id FROM valoracion WHERE id_usuario = $1 AND fecha = CURRENT_DATE',
      [id_usuario]
    );

    if (valoracionHoy.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Ya has enviado una valoración hoy. Puedes enviar otra mañana.'
      });
    }

    // Insertar en la base de datos
    const result = await client.query(
      `INSERT INTO valoracion (valor, id_usuario, fecha, feedback) 
       VALUES ($1, $2, CURRENT_DATE, $3) 
       RETURNING id, valor, fecha`,
      [puntuacion, id_usuario, feedback.trim()]
    );

    console.log('✅ Valoración guardada:', result.rows[0]);

    res.status(201).json({
      success: true,
      message: '✅ Valoración enviada exitosamente',
      valoracion: result.rows[0]
    });

  } catch (error) {
    console.error('❌ Error al crear valoración:', error);
    
    let errorMessage = 'Error interno del servidor al guardar valoración';
    
    if (error.code === '23503') {
      errorMessage = 'Error: El usuario no existe';
    } else if (error.code === '23502') {
      errorMessage = 'Error: Faltan campos obligatorios';
    }
    
    res.status(500).json({
      success: false,
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    if (client) {
      client.release();
    }
  }
});

// GET /api/valoraciones/estadisticas - Obtener estadísticas
router.get('/estadisticas', async (req, res) => {
  let client;
  try {
    client = await pool.connect();

    // Obtener promedio y total de valoraciones
    const estadisticasQuery = await client.query(`
      SELECT 
        AVG(valor) as promedio,
        COUNT(*) as total_valoraciones,
        COUNT(CASE WHEN valor = 1 THEN 1 END) as una_estrella,
        COUNT(CASE WHEN valor = 2 THEN 1 END) as dos_estrellas,
        COUNT(CASE WHEN valor = 3 THEN 1 END) as tres_estrellas,
        COUNT(CASE WHEN valor = 4 THEN 1 END) as cuatro_estrellas,
        COUNT(CASE WHEN valor = 5 THEN 1 END) as cinco_estrellas
      FROM valoracion
    `);

    const stats = estadisticasQuery.rows[0];
    
    const estadisticas = {
      promedio: parseFloat(stats.promedio) || 0,
      totalValoraciones: parseInt(stats.total_valoraciones) || 0,
      distribucion: [
        parseInt(stats.una_estrella) || 0,
        parseInt(stats.dos_estrellas) || 0,
        parseInt(stats.tres_estrellas) || 0,
        parseInt(stats.cuatro_estrellas) || 0,
        parseInt(stats.cinco_estrellas) || 0
      ]
    };

    console.log('📊 Estadísticas obtenidas:', estadisticas);

    res.json({
      success: true,
      estadisticas: estadisticas
    });

  } catch (error) {
    console.error('❌ Error al obtener estadísticas:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener estadísticas',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    if (client) {
      client.release();
    }
  }
});

// GET /api/valoraciones/mi-valoracion-hoy - Verificar si el usuario ya valoró hoy
router.get('/mi-valoracion-hoy', authMiddleware, async (req, res) => {
  let client;
  try {
    client = await pool.connect();

    const valoracionHoy = await client.query(
      'SELECT id, valor, feedback FROM valoracion WHERE id_usuario = $1 AND fecha = CURRENT_DATE',
      [req.user.userId]
    );

    res.json({
      success: true,
      yaValoroHoy: valoracionHoy.rows.length > 0,
      valoracion: valoracionHoy.rows[0] || null
    });

  } catch (error) {
    console.error('❌ Error al verificar valoración:', error);
    res.status(500).json({
      success: false,
      error: 'Error al verificar valoración'
    });
  } finally {
    if (client) {
      client.release();
    }
  }
});

module.exports = router;