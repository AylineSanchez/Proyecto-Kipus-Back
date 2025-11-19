// backend/routes/precios_unitarios.js
const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// GET /api/precios-unitarios/aislantes-muro
router.get('/aislantes-muro', async (req, res) => {
  try {
    console.log('📋 Obteniendo precios de aislantes de muro...');
    const result = await pool.query(`
      SELECT 
        id,
        elemento,
        precio_unitario,
        descripcion,
        unidad_medida
      FROM aislante_muro 
      ORDER BY elemento
    `);
    console.log('✅ Precios de aislantes de muro obtenidos:', result.rows.length);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('❌ Error obteniendo precios de aislantes de muro:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor al obtener precios de aislantes de muro',
      details: error.message
    });
  }
});

// GET /api/precios-unitarios/aislantes-techo
router.get('/aislantes-techo', async (req, res) => {
  try {
    console.log('📋 Obteniendo precios de aislantes de techo...');
    const result = await pool.query(`
      SELECT 
        id,
        elemento,
        precio_unitario,
        descripcion,
        unidad_medida
      FROM aislante_techo 
      ORDER BY elemento
    `);
    console.log('✅ Precios de aislantes de techo obtenidos:', result.rows.length);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('❌ Error obteniendo precios de aislantes de techo:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor al obtener precios de aislantes de techo',
      details: error.message
    });
  }
});

// GET /api/precios-unitarios/ventanas
router.get('/ventanas', async (req, res) => {
  try {
    console.log('📋 Obteniendo precios de ventanas...');
    const result = await pool.query(`
      SELECT 
        id,
        elemento,
        precio_unitario,
        descripcion,
        unidad_medida,
        utotal
      FROM ventana 
      ORDER BY elemento
    `);
    console.log('✅ Precios de ventanas obtenidos:', result.rows.length);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('❌ Error obteniendo precios de ventanas:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor al obtener precios de ventanas',
      details: error.message
    });
  }
});

// GET /api/precios-unitarios/materiales-construccion
router.get('/materiales-construccion', async (req, res) => {
  try {
    console.log('📋 Obteniendo precios de materiales de construcción...');
    const result = await pool.query(`
      SELECT 
        id,
        elemento,
        precio_unitario,
        descripcion,
        unidad_medida,
        tipo_material
      FROM material_construccion 
      ORDER BY elemento
    `);
    console.log('✅ Precios de materiales de construcción obtenidos:', result.rows.length);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('❌ Error obteniendo precios de materiales de construcción:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor al obtener precios de materiales de construcción',
      details: error.message
    });
  }
});

// GET /api/precios-unitarios/precio/:id
router.get('/precio/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📋 Obteniendo precio unitario ID: ${id}`);
    
    const result = await pool.query(
      'SELECT id, nombre, precio_total FROM precio_unitario WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Precio unitario no encontrado'
      });
    }
    
    console.log('✅ Precio unitario obtenido:', result.rows[0]);
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Error obteniendo precio unitario:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor al obtener precio unitario',
      details: error.message
    });
  }
});

// PUT /api/precios-unitarios/aislantes-muro/:id
router.put('/aislantes-muro/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { precio_unitario } = req.body;
    
    console.log(`🔄 Actualizando precio de aislante de muro ID: ${id}`);
    
    if (!precio_unitario || precio_unitario < 0) {
      return res.status(400).json({
        success: false,
        error: 'El precio unitario debe ser un número positivo'
      });
    }
    
    const result = await pool.query(
      'UPDATE aislante_muro SET precio_unitario = $1 WHERE id = $2 RETURNING *',
      [precio_unitario, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Aislante de muro no encontrado'
      });
    }
    
    console.log('✅ Precio de aislante de muro actualizado:', result.rows[0]);
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Precio actualizado correctamente'
    });
  } catch (error) {
    console.error('❌ Error actualizando precio de aislante de muro:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor al actualizar precio',
      details: error.message
    });
  }
});

// PUT /api/precios-unitarios/aislantes-techo/:id
router.put('/aislantes-techo/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { precio_unitario } = req.body;
    
    console.log(`🔄 Actualizando precio de aislante de techo ID: ${id}`);
    
    if (!precio_unitario || precio_unitario < 0) {
      return res.status(400).json({
        success: false,
        error: 'El precio unitario debe ser un número positivo'
      });
    }
    
    const result = await pool.query(
      'UPDATE aislante_techo SET precio_unitario = $1 WHERE id = $2 RETURNING *',
      [precio_unitario, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Aislante de techo no encontrado'
      });
    }
    
    console.log('✅ Precio de aislante de techo actualizado:', result.rows[0]);
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Precio actualizado correctamente'
    });
  } catch (error) {
    console.error('❌ Error actualizando precio de aislante de techo:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor al actualizar precio',
      details: error.message
    });
  }
});

// PUT /api/precios-unitarios/ventanas/:id
router.put('/ventanas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { precio_unitario } = req.body;
    
    console.log(`🔄 Actualizando precio de ventana ID: ${id}`);
    
    if (!precio_unitario || precio_unitario < 0) {
      return res.status(400).json({
        success: false,
        error: 'El precio unitario debe ser un número positivo'
      });
    }
    
    const result = await pool.query(
      'UPDATE ventana SET precio_unitario = $1 WHERE id = $2 RETURNING *',
      [precio_unitario, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Ventana no encontrada'
      });
    }
    
    console.log('✅ Precio de ventana actualizado:', result.rows[0]);
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Precio actualizado correctamente'
    });
  } catch (error) {
    console.error('❌ Error actualizando precio de ventana:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor al actualizar precio',
      details: error.message
    });
  }
});

// PUT /api/precios-unitarios/materiales-construccion/:id
router.put('/materiales-construccion/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { precio_unitario } = req.body;
    
    console.log(`🔄 Actualizando precio de material de construcción ID: ${id}`);
    
    if (!precio_unitario || precio_unitario < 0) {
      return res.status(400).json({
        success: false,
        error: 'El precio unitario debe ser un número positivo'
      });
    }
    
    const result = await pool.query(
      'UPDATE material_construccion SET precio_unitario = $1 WHERE id = $2 RETURNING *',
      [precio_unitario, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Material de construcción no encontrado'
      });
    }
    
    console.log('✅ Precio de material de construcción actualizado:', result.rows[0]);
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Precio actualizado correctamente'
    });
  } catch (error) {
    console.error('❌ Error actualizando precio de material de construcción:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor al actualizar precio',
      details: error.message
    });
  }
});

module.exports = router;