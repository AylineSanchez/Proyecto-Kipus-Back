// backend/routes/evaluacionAgua.js
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

// POST /api/evaluacion-agua/guardar - Guardar evaluación de agua
router.post('/guardar', authMiddleware, async (req, res) => {
  let client;
  try {
    const {
      precio_agua,
      consumo_agua_potable,
      servicio_alcantarillado,
      cantidad_duchas,
      cantidad_lavamanos,
      cantidad_wc,
      cantidad_lavaplatos,
      medida_ducha,
      medida_lavamanos,
      medida_wc,
      medida_lavaplatos,
      ahorro_m3_mes,
      ahorro_dinero,
      inversion,
      retorno,
      equivalente_tinas
    } = req.body;

    const id_usuario = req.user.userId;

    console.log('💾 Guardando evaluación de agua para usuario:', id_usuario);
    console.log('📊 Datos recibidos:', req.body);

    // Validaciones básicas
    if (!precio_agua || !consumo_agua_potable) {
      return res.status(400).json({
        success: false,
        error: 'Datos básicos incompletos'
      });
    }

    client = await pool.connect();

    // VERIFICAR SI YA EXISTE UNA EVALUACIÓN IDÉNTICA PARA ESTE USUARIO
    const existeEvaluacionQuery = `
      SELECT id FROM evaluacion_agua 
      WHERE id_usuario = $1 
        AND precio_agua = $2
        AND consumo_agua_potable = $3
        AND servicio_alcantarillado = $4
        AND cantidad_duchas = $5
        AND cantidad_lavamanos = $6
        AND cantidad_wc = $7
        AND cantidad_lavaplatos = $8
        AND medida_ducha = $9
        AND medida_lavamanos = $10
        AND medida_wc = $11
        AND medida_lavaplatos = $12
        AND ahorro_m3_mes = $13
        AND ahorro_dinero = $14
        AND inversion = $15
        AND retorno = $16
        AND equivalente_tinas = $17
    `;

    const existeEvaluacionParams = [
      id_usuario, 
      parseFloat(precio_agua),
      parseInt(consumo_agua_potable),
      servicio_alcantarillado ? parseInt(servicio_alcantarillado) : null,
      parseInt(cantidad_duchas) || 0,
      parseInt(cantidad_lavamanos) || 0,
      parseInt(cantidad_wc) || 0,
      parseInt(cantidad_lavaplatos) || 0,
      medida_ducha ? parseInt(medida_ducha) : null,
      medida_lavamanos ? parseInt(medida_lavamanos) : null,
      medida_wc ? parseInt(medida_wc) : null,
      medida_lavaplatos ? parseInt(medida_lavaplatos) : null,
      parseFloat(ahorro_m3_mes) || 0,
      parseFloat(ahorro_dinero) || 0,
      parseInt(inversion) || 0,
      parseInt(retorno) || 0,
      parseFloat(equivalente_tinas) || 0
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

    // Generar ID único para la evaluación
    const idResult = await client.query(
      'SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM evaluacion_agua'
    );
    const nextId = idResult.rows[0].next_id;

    // Insertar evaluación
    const insertQuery = `
      INSERT INTO evaluacion_agua (
        id, precio_agua, id_usuario, cantidad_duchas, cantidad_lavamanos, 
        cantidad_wc, cantidad_lavaplatos, medida_ducha, medida_lavamanos, 
        medida_wc, medida_lavaplatos, ahorro_m3_mes, ahorro_dinero, 
        inversion, retorno, equivalente_tinas, consumo_agua_potable, servicio_alcantarillado
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *
    `;

    const insertParams = [
      nextId, 
      parseFloat(precio_agua),
      id_usuario, 
      parseInt(cantidad_duchas) || 0,
      parseInt(cantidad_lavamanos) || 0,
      parseInt(cantidad_wc) || 0,
      parseInt(cantidad_lavaplatos) || 0,
      medida_ducha ? parseInt(medida_ducha) : null,
      medida_lavamanos ? parseInt(medida_lavamanos) : null,
      medida_wc ? parseInt(medida_wc) : null,
      medida_lavaplatos ? parseInt(medida_lavaplatos) : null,
      parseFloat(ahorro_m3_mes) || 0,
      parseFloat(ahorro_dinero) || 0,
      parseInt(inversion) || 0,
      parseInt(retorno) || 0,
      parseFloat(equivalente_tinas) || 0,
      parseInt(consumo_agua_potable),
      servicio_alcantarillado ? parseInt(servicio_alcantarillado) : null
    ];

    const result = await client.query(insertQuery, insertParams);

    console.log('✅ Evaluación de agua guardada con ID:', result.rows[0].id);

    res.status(201).json({
      success: true,
      message: 'Evaluación de agua guardada exitosamente',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('❌ Error guardando evaluación de agua:', error);
    
    let errorMessage = 'Error interno del servidor al guardar evaluación';
    
    if (error.code === '23503') {
      errorMessage = 'Error: Referencia a usuario o medida no válida';
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

// GET /api/evaluacion-agua/mis-evaluaciones - OBTENER EVALUACIONES DE AGUA DEL USUARIO
router.get('/mis-evaluaciones', authMiddleware, async (req, res) => {
  let client;
  try {
    client = await pool.connect();

    const query = `
      SELECT 
        ea.*,
        aap1.artefacto as medida_ducha_nombre,
        aap1.medida_ahorro as medida_ducha_descripcion,
        aap2.artefacto as medida_lavamanos_nombre,
        aap2.medida_ahorro as medida_lavamanos_descripcion,
        aap3.artefacto as medida_lavaplatos_nombre,
        aap3.medida_ahorro as medida_lavaplatos_descripcion,
        aap4.artefacto as medida_wc_nombre,
        aap4.medida_ahorro as medida_wc_descripcion
      FROM evaluacion_agua ea
      LEFT JOIN artefacto_ahorro_precio aap1 ON ea.medida_ducha = aap1.id
      LEFT JOIN artefacto_ahorro_precio aap2 ON ea.medida_lavamanos = aap2.id
      LEFT JOIN artefacto_ahorro_precio aap3 ON ea.medida_lavaplatos = aap3.id
      LEFT JOIN artefacto_ahorro_precio aap4 ON ea.medida_wc = aap4.id
      WHERE ea.id_usuario = $1
      ORDER BY ea.id DESC
    `;

    const result = await client.query(query, [req.user.userId]);

    console.log(`💧 Evaluaciones de agua encontradas: ${result.rows.length} para usuario ${req.user.userId}`);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('❌ Error obteniendo evaluaciones de agua:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor al obtener evaluaciones de agua',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    if (client) client.release();
  }
});

// GET /api/evaluacion-agua/:id - Obtener una evaluación específica de agua
router.get('/:id', authMiddleware, async (req, res) => {
  let client;
  try {
    const { id } = req.params;

    client = await pool.connect();

    const query = `
      SELECT 
        ea.*,
        aap1.artefacto as medida_ducha_nombre,
        aap1.medida_ahorro as medida_ducha_descripcion,
        aap2.artefacto as medida_lavamanos_nombre,
        aap2.medida_ahorro as medida_lavamanos_descripcion,
        aap3.artefacto as medida_lavaplatos_nombre,
        aap3.medida_ahorro as medida_lavaplatos_descripcion,
        aap4.artefacto as medida_wc_nombre,
        aap4.medida_ahorro as medida_wc_descripcion
      FROM evaluacion_agua ea
      LEFT JOIN artefacto_ahorro_precio aap1 ON ea.medida_ducha = aap1.id
      LEFT JOIN artefacto_ahorro_precio aap2 ON ea.medida_lavamanos = aap2.id
      LEFT JOIN artefacto_ahorro_precio aap3 ON ea.medida_lavaplatos = aap3.id
      LEFT JOIN artefacto_ahorro_precio aap4 ON ea.medida_wc = aap4.id
      WHERE ea.id = $1 AND ea.id_usuario = $2
    `;

    const result = await client.query(query, [id, req.user.userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Evaluación de agua no encontrada'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('❌ Error obteniendo evaluación de agua:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor al obtener evaluación de agua',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    if (client) client.release();
  }
});

// DELETE /api/evaluacion-agua/:id - Eliminar evaluación de agua
router.delete('/:id', authMiddleware, async (req, res) => {
  let client;
  try {
    const { id } = req.params;

    client = await pool.connect();

    const result = await client.query(
      'DELETE FROM evaluacion_agua WHERE id = $1 AND id_usuario = $2 RETURNING id',
      [id, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Evaluación de agua no encontrada'
      });
    }

    console.log('🗑️ Evaluación de agua eliminada:', result.rows[0].id);

    res.json({
      success: true,
      message: 'Evaluación de agua eliminada exitosamente',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('❌ Error eliminando evaluación de agua:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor al eliminar evaluación de agua',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    if (client) client.release();
  }
});

module.exports = router;