// backend/routes/materiales.js
const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// GET /api/materiales/muros
router.get('/muros', async (req, res) => {
  try {
    console.log('📋 Obteniendo muros desde la BD...');
    const result = await pool.query('SELECT * FROM muros ORDER BY id');
    console.log('✅ Muros obtenidos:', result.rows.length);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('❌ Error obteniendo muros:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor al obtener muros',
      details: error.message
    });
  }
});

// GET /api/materiales/aislantes-muro
router.get('/aislantes-muro', async (req, res) => {
  try {
    console.log('📋 Obteniendo aislantes de muro desde la BD...');
    const result = await pool.query('SELECT * FROM aislante_muro ORDER BY id');
    console.log('✅ Aislantes de muro obtenidos:', result.rows.length);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('❌ Error obteniendo aislantes de muro:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor al obtener aislantes de muro',
      details: error.message
    });
  }
});

// GET /api/materiales/techos
router.get('/techos', async (req, res) => {
  try {
    console.log('📋 Obteniendo techos desde la BD...');
    const result = await pool.query('SELECT * FROM techo ORDER BY id');
    console.log('✅ Techos obtenidos:', result.rows.length);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('❌ Error obteniendo techos:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor al obtener techos',
      details: error.message
    });
  }
});

// GET /api/materiales/aislantes-techo
router.get('/aislantes-techo', async (req, res) => {
  try {
    console.log('📋 Obteniendo aislantes de techo desde la BD...');
    const result = await pool.query('SELECT * FROM aislante_techo ORDER BY id');
    console.log('✅ Aislantes de techo obtenidos:', result.rows.length);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('❌ Error obteniendo aislantes de techo:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor al obtener aislantes de techo',
      details: error.message
    });
  }
});

// GET /api/materiales/ventanas
router.get('/ventanas', async (req, res) => {
  try {
    console.log('📋 Obteniendo ventanas desde la BD...');
    const result = await pool.query('SELECT * FROM ventana ORDER BY id');
    console.log('✅ Ventanas obtenidas:', result.rows.length);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('❌ Error obteniendo ventanas:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor al obtener ventanas',
      details: error.message
    });
  }
});

// GET /api/materiales/sistemas-calefaccion - ACTUALIZADO CON PRECIO_KWH
router.get('/sistemas-calefaccion', async (req, res) => {
  try {
    console.log('📋 Obteniendo sistemas de calefacción desde la BD...');
    const result = await pool.query(`
      SELECT 
        id,
        nombre,
        modelo,
        potencia_kw,
        eficiencia_cop,
        precio_unitario,
        precio_kwh, 
        unidad_precio
      FROM combustible 
      ORDER BY nombre
    `);
    console.log('✅ Sistemas de calefacción obtenidos:', result.rows.length);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('❌ Error obteniendo sistemas de calefacción:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor al obtener sistemas de calefacción',
      details: error.message
    });
  }
});

module.exports = router;