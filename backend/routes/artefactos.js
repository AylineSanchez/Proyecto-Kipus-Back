// backend/routes/artefactos.js
const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// GET /api/artefactos - Obtener todos los artefactos
router.get('/', async (req, res) => {
  try {
    console.log('🔍 Solicitando lista de artefactos...');
    
    const result = await pool.query('SELECT * FROM artefacto ORDER BY id');
    
    console.log('✅ Artefactos obtenidos:', result.rows.length);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('❌ Error obteniendo artefactos:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener artefactos',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/artefactos/medidas - Obtener todas las medidas de ahorro
router.get('/medidas', async (req, res) => {
  try {
    console.log('🔍 Solicitando medidas de ahorro...');
    
    const result = await pool.query('SELECT * FROM artefacto_ahorro_precio ORDER BY artefacto, id');
    
    console.log('✅ Medidas obtenidas:', result.rows.length);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('❌ Error obteniendo medidas:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener medidas de ahorro',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;