// backend/routes/vivienda.js
const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Middleware de autenticación simplificado
const authMiddleware = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Token no proporcionado'
      });
    }

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secreto-desarrollo');
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Token inválido o expirado'
    });
  }
};

// GET /api/vivienda/datos - Obtener datos de la vivienda del usuario
router.get('/datos', authMiddleware, async (req, res) => {
  let client;
  try {
    const usuarioId = req.user.userId;

    console.log('🔍 Solicitando datos de vivienda para usuario ID:', usuarioId);

    if (!usuarioId) {
      return res.status(400).json({
        success: false,
        error: 'ID de usuario no válido'
      });
    }

    client = await pool.connect();
    console.log('✅ Conexión a BD establecida');

    // Consulta CORREGIDA - solo columnas que existen
    const result = await client.query(
      `SELECT 
        id_vivienda,
        cantidad_personas, 
        superficie_1, 
        superficie_2, 
        region, 
        comuna
       FROM vivienda 
       WHERE id_usuario = $1`,
      [usuarioId]
    );

    console.log('📊 Resultado de consulta:', {
      rowsCount: result.rows.length,
      datos: result.rows[0]
    });

    if (result.rows.length === 0) {
      console.log('⚠️ No se encontró vivienda para el usuario ID:', usuarioId);
      return res.status(404).json({
        success: false,
        error: 'No se encontraron datos de vivienda para este usuario',
        detalles: `Usuario ID: ${usuarioId} no tiene vivienda registrada`
      });
    }

    const vivienda = result.rows[0];
    console.log('✅ Datos de vivienda obtenidos:', vivienda);

    res.json({
      success: true,
      vivienda: {
        id_vivienda: vivienda.id_vivienda,
        cantidad_personas: vivienda.cantidad_personas,
        superficie_1: vivienda.superficie_1,
        superficie_2: vivienda.superficie_2,
        region: vivienda.region,
        comuna: vivienda.comuna
      }
    });

  } catch (error) {
    console.error('❌ Error al obtener datos de vivienda:', error);
    
    let errorMessage = 'Error al obtener datos de vivienda';
    let statusCode = 500;

    if (error.code === '42P01') { // Tabla no existe
      errorMessage = 'Error: La tabla vivienda no existe en la base de datos';
    } else if (error.code === '28P01') { // Error de autenticación
      errorMessage = 'Error de conexión a la base de datos';
    } else if (error.code === 'ECONNREFUSED') {
      errorMessage = 'No se puede conectar a la base de datos';
    } else if (error.code === '42703') { // Columna no existe
      errorMessage = 'Error: Problema con la estructura de la base de datos';
    }

    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      detalles: process.env.NODE_ENV === 'development' ? {
        message: error.message,
        code: error.code
      } : undefined
    });
  } finally {
    if (client) {
      client.release();
      console.log('🔓 Conexión liberada');
    }
  }
});

// PUT /api/vivienda/actualizar-personas - Actualizar cantidad de personas
router.put('/actualizar-personas', authMiddleware, async (req, res) => {
  let client;
  try {
    const { cantidad_personas } = req.body;
    const usuarioId = req.user.userId;

    console.log('📝 Actualizando personas para usuario ID:', usuarioId, 'Nueva cantidad:', cantidad_personas);

    // Validaciones
    if (!cantidad_personas || cantidad_personas < 1) {
      return res.status(400).json({
        success: false,
        error: 'La cantidad de personas debe ser al menos 1'
      });
    }

    if (!usuarioId) {
      return res.status(400).json({
        success: false,
        error: 'ID de usuario no válido'
      });
    }

    client = await pool.connect();

    // Verificar que existe la vivienda
    const viviendaCheck = await client.query(
      'SELECT id_vivienda FROM vivienda WHERE id_usuario = $1',
      [usuarioId]
    );

    if (viviendaCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No se encontró la vivienda del usuario'
      });
    }

    // Actualizar cantidad de personas
    const result = await client.query(
      `UPDATE vivienda 
       SET cantidad_personas = $1 
       WHERE id_usuario = $2 
       RETURNING cantidad_personas, id_vivienda`,
      [parseInt(cantidad_personas), usuarioId]
    );

    console.log('✅ Personas actualizadas:', result.rows[0]);

    res.json({
      success: true,
      message: 'Cantidad de personas actualizada exitosamente',
      nueva_cantidad: result.rows[0].cantidad_personas,
      id_vivienda: result.rows[0].id_vivienda
    });

  } catch (error) {
    console.error('❌ Error al actualizar cantidad de personas:', error);
    
    let errorMessage = 'Error al actualizar cantidad de personas';
    
    if (error.code === '23503') { // Foreign key violation
      errorMessage = 'Error: El usuario no existe';
    }

    res.status(500).json({
      success: false,
      error: errorMessage,
      detalles: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    if (client) {
      client.release();
    }
  }
});

// GET /api/vivienda/diagnostico - Endpoint de diagnóstico
router.get('/diagnostico', authMiddleware, async (req, res) => {
  let client;
  try {
    const usuarioId = req.user.userId;

    console.log('🔧 Ejecutando diagnóstico para usuario ID:', usuarioId);

    client = await pool.connect();

    // 1. Verificar conexión a la BD
    const dbCheck = await client.query('SELECT NOW() as current_time, version() as version');
    
    // 2. Verificar estructura de la tabla vivienda
    const tableCheck = await client.query(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'vivienda' 
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `);

    // 3. Verificar datos del usuario
    const userCheck = await client.query(
      'SELECT id, correo, nombre_completo FROM usuario WHERE id = $1',
      [usuarioId]
    );

    // 4. Verificar datos de vivienda (solo columnas existentes)
    const viviendaCheck = await client.query(
      'SELECT id_vivienda, cantidad_personas, superficie_1, superficie_2, region, comuna FROM vivienda WHERE id_usuario = $1',
      [usuarioId]
    );

    // 5. Contar total de viviendas en la BD
    const totalViviendas = await client.query('SELECT COUNT(*) as total FROM vivienda');

    res.json({
      success: true,
      diagnostico: {
        database: {
          connected: true,
          currentTime: dbCheck.rows[0].current_time,
          version: dbCheck.rows[0].version
        },
        tabla_vivienda: {
          existe: tableCheck.rows.length > 0,
          columnas: tableCheck.rows
        },
        usuario: {
          solicitado: req.user,
          encontrado_en_bd: userCheck.rows[0] || 'NO ENCONTRADO'
        },
        vivienda: {
          encontrada: viviendaCheck.rows.length > 0,
          datos: viviendaCheck.rows[0] || 'NO ENCONTRADA',
          total_viviendas_en_bd: parseInt(totalViviendas.rows[0].total)
        }
      }
    });

  } catch (error) {
    console.error('❌ Error en diagnóstico:', error);
    res.status(500).json({
      success: false,
      error: 'Error en diagnóstico',
      detalles: process.env.NODE_ENV === 'development' ? {
        message: error.message,
        code: error.code
      } : undefined
    });
  } finally {
    if (client) {
      client.release();
    }
  }
});

// POST /api/vivienda/crear - Crear vivienda (para testing)
router.post('/crear', authMiddleware, async (req, res) => {
  let client;
  try {
    const { region, comuna, cantidad_personas, superficie_1, superficie_2 } = req.body;
    const usuarioId = req.user.userId;

    console.log('🏠 Creando vivienda para usuario ID:', usuarioId);

    client = await pool.connect();

    // Verificar si ya existe vivienda
    const viviendaExistente = await client.query(
      'SELECT id_vivienda FROM vivienda WHERE id_usuario = $1',
      [usuarioId]
    );

    if (viviendaExistente.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'El usuario ya tiene una vivienda registrada'
      });
    }

    // Crear nueva vivienda (sin fecha_creacion)
    const result = await client.query(
      `INSERT INTO vivienda (id_usuario, region, comuna, cantidad_personas, superficie_1, superficie_2) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id_vivienda, cantidad_personas, superficie_1, superficie_2, region, comuna`,
      [
        usuarioId, 
        region || 'Metropolitana', 
        comuna || 'Santiago', 
        parseInt(cantidad_personas) || 1, 
        parseFloat(superficie_1) || 0, 
        parseFloat(superficie_2) || 0
      ]
    );

    console.log('✅ Vivienda creada:', result.rows[0]);

    res.status(201).json({
      success: true,
      message: 'Vivienda creada exitosamente',
      vivienda: result.rows[0]
    });

  } catch (error) {
    console.error('❌ Error al crear vivienda:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear vivienda',
      detalles: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    if (client) {
      client.release();
    }
  }
});

// backend/routes/vivienda.js - Agregar este endpoint
router.put('/actualizar-superficies', authMiddleware, async (req, res) => {
  try {
    const { superficie_1, superficie_2 } = req.body;
    const id_usuario = req.user.userId;

    const result = await pool.query(
      'UPDATE vivienda SET superficie_1 = $1, superficie_2 = $2 WHERE id_usuario = $3 RETURNING *',
      [superficie_1, superficie_2 || 0, id_usuario]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Vivienda no encontrada'
      });
    }

    res.json({
      success: true,
      message: 'Superficies actualizadas exitosamente',
      vivienda: result.rows[0]
    });

  } catch (error) {
    console.error('Error actualizando superficies:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

module.exports = router;