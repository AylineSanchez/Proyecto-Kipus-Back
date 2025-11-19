// backend/routes/evaluaciones.js
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

// POST /api/evaluaciones/guardar - Guardar evaluación de calefacción
router.post('/guardar', authMiddleware, async (req, res) => {
  let client;
  try {
    const {
      superficie_1,
      superficie_2,
      areaVentana1,
      areaVentana2,
      id_combustible,
      consumoAnual,
      id_solucion_muro1,
      id_solucion_muro2,
      id_solucion_techo,
      id_solucion_ventana,
      eficiencia,
      inversion,
      ahorroAnual,
      payback,
      reduccionCo2
    } = req.body;

    console.log('💾 Guardando evaluación de calefacción:', {
      id_usuario: req.user.userId,
      superficie_1,
      superficie_2,
      areaVentana1,
      areaVentana2,
      id_combustible,
      consumoAnual,
      id_solucion_muro1,
      id_solucion_muro2,
      id_solucion_techo,
      id_solucion_ventana,
      eficiencia,
      inversion,
      ahorroAnual,
      payback,
      reduccionCo2
    });

    // Validaciones básicas
    if (!superficie_1 || !id_combustible || !consumoAnual) {
      return res.status(400).json({
        success: false,
        error: 'Faltan campos obligatorios: superficie_1, id_combustible, consumoAnual'
      });
    }

    client = await pool.connect();

    // Verificar si ya existe una evaluación idéntica
    const existeEvaluacionQuery = `
      SELECT id FROM evaluacion_calefaccion 
      WHERE id_usuario = $1 
        AND superficie_1 = $2
        AND superficie_2 = $3
        AND areaventana1 = $4
        AND areaventana2 = $5
        AND id_combustible = $6
        AND consumoanual = $7
        AND id_solucion_muro1 = $8
        AND id_solucion_muro2 = $9
        AND id_solucion_techo = $10
        AND id_solucion_ventana = $11
        AND eficiencia = $12
        AND inversion = $13
        AND ahorroanual = $14
        AND payback = $15
        AND reduccionco2 = $16
    `;

    const existeEvaluacionParams = [
      req.user.userId,
      parseFloat(superficie_1),
      parseFloat(superficie_2) || 0,
      parseFloat(areaVentana1) || 0,
      parseFloat(areaVentana2) || 0,
      parseInt(id_combustible),
      parseFloat(consumoAnual),
      id_solucion_muro1 ? parseInt(id_solucion_muro1) : null,
      id_solucion_muro2 ? parseInt(id_solucion_muro2) : null,
      id_solucion_techo ? parseInt(id_solucion_techo) : null,
      id_solucion_ventana ? parseInt(id_solucion_ventana) : null,
      parseFloat(eficiencia) || 0,
      parseFloat(inversion) || 0,
      parseFloat(ahorroAnual) || 0,
      parseFloat(payback) || 0,
      parseFloat(reduccionCo2) || 0
    ];

    const existeResult = await client.query(existeEvaluacionQuery, existeEvaluacionParams);
    
    if (existeResult.rows.length > 0) {
      console.log('⚠️ Ya existe una evaluación idéntica para este usuario');
      return res.status(409).json({
        success: false,
        error: 'Ya existe una evaluación idéntica para este usuario',
        evaluacion_id: existeResult.rows[0].id
      });
    }

    const query = `
      INSERT INTO evaluacion_calefaccion (
        id_usuario, superficie_1, superficie_2, areaventana1, areaventana2,
        id_combustible, consumoanual, id_solucion_muro1, id_solucion_muro2,
        id_solucion_techo, id_solucion_ventana, eficiencia, inversion,
        ahorroanual, payback, reduccionco2
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
    `;

    const values = [
      req.user.userId,
      parseFloat(superficie_1),
      parseFloat(superficie_2) || 0,
      parseFloat(areaVentana1) || 0,
      parseFloat(areaVentana2) || 0,
      parseInt(id_combustible),
      parseFloat(consumoAnual),
      id_solucion_muro1 ? parseInt(id_solucion_muro1) : null,
      id_solucion_muro2 ? parseInt(id_solucion_muro2) : null,
      id_solucion_techo ? parseInt(id_solucion_techo) : null,
      id_solucion_ventana ? parseInt(id_solucion_ventana) : null,
      parseFloat(eficiencia) || 0,
      parseFloat(inversion) || 0,
      parseFloat(ahorroAnual) || 0,
      parseFloat(payback) || 0,
      parseFloat(reduccionCo2) || 0
    ];

    const result = await client.query(query, values);

    console.log('✅ Evaluación de calefacción guardada exitosamente:', result.rows[0].id);

    res.status(201).json({
      success: true,
      message: 'Evaluación de calefacción guardada exitosamente',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('❌ Error guardando evaluación de calefacción:', error);
    
    let errorMessage = 'Error interno del servidor al guardar evaluación';
    
    if (error.code === '23503') {
      errorMessage = 'Error: Referencia a usuario, combustible o solución no válida';
    } else if (error.code === '23502') {
      errorMessage = 'Error: Faltan campos obligatorios';
    }
    
    res.status(500).json({
      success: false,
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    if (client) client.release();
  }
});

// GET /api/evaluaciones/mis-evaluaciones - Obtener evaluaciones de calefacción del usuario
router.get('/mis-evaluaciones', authMiddleware, async (req, res) => {
  let client;
  try {
    client = await pool.connect();

    const query = `
      SELECT 
        ec.*,
        c.nombre as combustible_nombre,
        ms1.solucion as solucion_muro1_nombre,
        ms2.solucion as solucion_muro2_nombre,
        ts.solucion as solucion_techo_nombre,
        vs.utotal as solucion_ventana_utotal,
        v.elemento as solucion_ventana_nombre
      FROM evaluacion_calefaccion ec
      LEFT JOIN combustible c ON ec.id_combustible = c.id
      LEFT JOIN muro_solucion ms1 ON ec.id_solucion_muro1 = ms1.id
      LEFT JOIN muro_solucion ms2 ON ec.id_solucion_muro2 = ms2.id
      LEFT JOIN techo_solucion ts ON ec.id_solucion_techo = ts.id
      LEFT JOIN ventana_solucion vs ON ec.id_solucion_ventana = vs.id
      LEFT JOIN ventana v ON vs.id_ventana_solucion = v.id
      WHERE ec.id_usuario = $1
      ORDER BY ec.fecha_creacion DESC
    `;

    const result = await client.query(query, [req.user.userId]);

    console.log(`📊 Evaluaciones de calefacción encontradas: ${result.rows.length} para usuario ${req.user.userId}`);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('❌ Error obteniendo evaluaciones de calefacción:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor al obtener evaluaciones de calefacción',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    if (client) client.release();
  }
});

// GET /api/evaluaciones/:id - Obtener una evaluación específica de calefacción
router.get('/:id', authMiddleware, async (req, res) => {
  let client;
  try {
    const { id } = req.params;

    client = await pool.connect();

    const query = `
      SELECT 
        ec.*,
        c.nombre as combustible_nombre,
        ms1.solucion as solucion_muro1_nombre,
        ms2.solucion as solucion_muro2_nombre,
        ts.solucion as solucion_techo_nombre,
        vs.utotal as solucion_ventana_utotal,
        v.elemento as solucion_ventana_nombre
      FROM evaluacion_calefaccion ec
      LEFT JOIN combustible c ON ec.id_combustible = c.id
      LEFT JOIN muro_solucion ms1 ON ec.id_solucion_muro1 = ms1.id
      LEFT JOIN muro_solucion ms2 ON ec.id_solucion_muro2 = ms2.id
      LEFT JOIN techo_solucion ts ON ec.id_solucion_techo = ts.id
      LEFT JOIN ventana_solucion vs ON ec.id_solucion_ventana = vs.id
      LEFT JOIN ventana v ON vs.id_ventana_solucion = v.id
      WHERE ec.id = $1 AND ec.id_usuario = $2
    `;

    const result = await client.query(query, [id, req.user.userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Evaluación de calefacción no encontrada'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('❌ Error obteniendo evaluación de calefacción:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor al obtener evaluación de calefacción',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    if (client) client.release();
  }
});

// DELETE /api/evaluaciones/:id - Eliminar evaluación de calefacción
router.delete('/:id', authMiddleware, async (req, res) => {
  let client;
  try {
    const { id } = req.params;

    client = await pool.connect();

    const result = await client.query(
      'DELETE FROM evaluacion_calefaccion WHERE id = $1 AND id_usuario = $2 RETURNING id',
      [id, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Evaluación de calefacción no encontrada'
      });
    }

    console.log('🗑️ Evaluación de calefacción eliminada:', result.rows[0].id);

    res.json({
      success: true,
      message: 'Evaluación de calefacción eliminada exitosamente',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('❌ Error eliminando evaluación de calefacción:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor al eliminar evaluación de calefacción',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    if (client) client.release();
  }
});

// GET /api/evaluaciones/estadisticas - Obtener estadísticas de evaluaciones
router.get('/estadisticas/generales', authMiddleware, async (req, res) => {
  let client;
  try {
    client = await pool.connect();

    // Estadísticas de calefacción
    const calefaccionStats = await client.query(`
      SELECT 
        COUNT(*) as total,
        AVG(eficiencia) as eficiencia_promedio,
        AVG(inversion) as inversion_promedio,
        AVG(ahorroanual) as ahorro_promedio,
        AVG(payback) as payback_promedio,
        AVG(reduccionco2) as reduccion_co2_promedio
      FROM evaluacion_calefaccion 
      WHERE id_usuario = $1
    `, [req.user.userId]);

    res.json({
      success: true,
      data: {
        calefaccion: calefaccionStats.rows[0]
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo estadísticas:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor al obtener estadísticas',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    if (client) client.release();
  }
});

module.exports = router;