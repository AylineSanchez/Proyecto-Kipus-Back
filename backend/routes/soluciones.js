// backend/routes/soluciones.js
const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// GET /api/soluciones/muro
router.get('/muro', async (req, res) => {
  try {
    console.log('📋 Obteniendo soluciones de muro desde la BD...');
    const result = await pool.query(`
      SELECT 
        ms.*, 
        am.elemento as aislante_elemento
      FROM muro_solucion ms
      JOIN aislante_muro am ON ms.id_aislante_muro = am.id
      ORDER BY am.elemento, ms.r_solucion
    `);
    console.log('✅ Soluciones de muro obtenidas:', result.rows.length);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('❌ Error obteniendo soluciones de muro:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor al obtener soluciones de muro',
      details: error.message
    });
  }
});

// GET /api/soluciones/techo
router.get('/techo', async (req, res) => {
  try {
    console.log('📋 Obteniendo soluciones de techo desde la BD...');
    const result = await pool.query(`
      SELECT 
        ts.*, 
        at.elemento as aislante_elemento
      FROM techo_solucion ts
      JOIN aislante_techo at ON ts.id_aislante_techo = at.id
      ORDER BY at.elemento, ts.r_solucion
    `);
    console.log('✅ Soluciones de techo obtenidas:', result.rows.length);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('❌ Error obteniendo soluciones de techo:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor al obtener soluciones de techo',
      details: error.message
    });
  }
});

// GET /api/soluciones/ventana - CORREGIDO
router.get('/ventana', async (req, res) => {
  try {
    console.log('📋 Obteniendo soluciones de ventana desde la BD...');
    const result = await pool.query(`
      SELECT 
        vs.*, 
        v1.elemento as ventana_actual_elemento,
        v2.elemento as ventana_solucion_elemento
      FROM ventana_solucion vs
      JOIN ventana v1 ON vs.id_ventana = v1.id
      JOIN ventana v2 ON vs.id_ventana_solucion = v2.id
      ORDER BY v1.elemento, vs.utotal
    `);
    console.log('✅ Soluciones de ventana obtenidas:', result.rows.length);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('❌ Error obteniendo soluciones de ventana:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor al obtener soluciones de ventana',
      details: error.message
    });
  }
});

module.exports = router;