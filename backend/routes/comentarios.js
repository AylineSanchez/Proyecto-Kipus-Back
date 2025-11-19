// backend/routes/comentarios.js - VERSIÓN CORREGIDA
const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const jwt = require('jsonwebtoken');

// Middleware de autenticación
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    console.log('🔐 Token recibido:', token ? 'Presente' : 'Faltante');
    
    if (!token) {
      return res.status(401).json({ 
        success: false,
        error: 'Token no proporcionado' 
      });
    }

    try {
      // Verificar el token JWT
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secreto-desarrollo');
      req.user = decoded;
      
      console.log('👤 Usuario autenticado desde JWT:', req.user);
      
    } catch (jwtError) {
      console.log('⚠️  Error verificando JWT:', jwtError.message);
      return res.status(401).json({
        success: false,
        error: 'Token inválido o expirado'
      });
    }

    next();
  } catch (error) {
    console.error('❌ Error en middleware de autenticación:', error);
    return res.status(401).json({ 
      success: false,
      error: 'Error de autenticación' 
    });
  }
};

// POST /api/comentarios - Crear nuevo comentario
router.post('/', authMiddleware, async (req, res) => {
  let client;
  try {
    const { tipoComentario, mensaje } = req.body;
    const id_usuario = req.user.userId; // Usar userId del token JWT

    console.log('📝 Datos recibidos para comentario:', { 
      tipoComentario, 
      mensaje, 
      id_usuario,
      usuario: req.user 
    });

    // Validar datos
    if (!tipoComentario || !mensaje) {
      return res.status(400).json({
        success: false,
        error: 'Todos los campos son obligatorios'
      });
    }

    // Validar tipo de comentario
    const tiposPermitidos = ['sugerencia', 'problema', 'mejora', 'felicitacion', 'otro'];
    if (!tiposPermitidos.includes(tipoComentario)) {
      return res.status(400).json({
        success: false,
        error: 'Tipo de comentario no válido'
      });
    }

    // Obtener cliente de la pool
    client = await pool.connect();

    // VERIFICAR SI EL USUARIO EXISTE EN LA BD - USANDO COLUMNAS CORRECTAS
    console.log('🔍 Verificando usuario en BD con ID:', id_usuario);
    const usuarioCheck = await client.query(
      'SELECT id, correo, nombre_completo FROM usuario WHERE id = $1',
      [id_usuario]
    );

    console.log('📊 Resultado verificación usuario:', usuarioCheck.rows);

    if (usuarioCheck.rows.length === 0) {
      console.log('❌ Usuario no encontrado en BD, ID:', id_usuario);
      return res.status(404).json({
        success: false,
        error: `Usuario con ID ${id_usuario} no encontrado en la base de datos`
      });
    }

    console.log('✅ Usuario encontrado:', usuarioCheck.rows[0]);

    // Insertar en la base de datos
    console.log('💾 Insertando comentario en BD...');
    const result = await client.query(
      `INSERT INTO comentario (tipo, descripcion, id_usuario, fecha) 
       VALUES ($1, $2, $3, CURRENT_DATE) 
       RETURNING id, tipo, descripcion, id_usuario, fecha`,
      [tipoComentario, mensaje, id_usuario]
    );

    console.log('✅ Comentario guardado exitosamente:', result.rows[0]);

    res.status(201).json({
      success: true,
      message: '✅ Comentario enviado exitosamente',
      comentario: result.rows[0]
    });

  } catch (error) {
    console.error('❌ Error al crear comentario:', error);
    console.error('🔧 Detalles del error:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      table: error.table,
      constraint: error.constraint
    });
    
    let errorMessage = 'Error interno del servidor al guardar comentario';
    
    if (error.code === '23503') { // Foreign key violation
      errorMessage = 'Error: El usuario no existe en la base de datos';
    } else if (error.code === '23502') { // Not null violation
      errorMessage = 'Error: Faltan campos obligatorios';
    } else if (error.code === '23505') { // Unique violation
      errorMessage = 'Error: El comentario ya existe';
    }
    
    res.status(500).json({
      success: false,
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? {
        message: error.message,
        code: error.code,
        detail: error.detail
      } : undefined
    });
  } finally {
    if (client) {
      client.release();
    }
  }
});

// Ruta de diagnóstico CORREGIDA
router.get('/diagnostico', authMiddleware, async (req, res) => {
  let client;
  try {
    client = await pool.connect();
    
    // 1. Verificar conexión a la BD
    const dbCheck = await client.query('SELECT NOW() as current_time, version() as version');
    
    // 2. Verificar estructura de la tabla comentario
    const tableCheck = await client.query(`
      SELECT 
        table_name,
        column_name, 
        data_type, 
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'comentario' 
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    
    // 3. Verificar estructura de la tabla usuario
    const usuarioTableCheck = await client.query(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'usuario' 
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    
    // 4. Verificar datos de usuario - USANDO COLUMNAS CORRECTAS
    const userCheck = await client.query(
      'SELECT id, correo, nombre_completo FROM usuario WHERE id = $1',
      [req.user.userId]
    );
    
    // 5. Verificar comentarios existentes
    const comentariosCheck = await client.query(`
      SELECT COUNT(*) as total_comentarios 
      FROM comentario 
      WHERE id_usuario = $1
    `, [req.user.userId]);

    res.json({
      success: true,
      diagnostico: {
        database: {
          connected: true,
          currentTime: dbCheck.rows[0].current_time,
          version: dbCheck.rows[0].version
        },
        tabla_comentario: {
          existe: tableCheck.rows.length > 0,
          columnas: tableCheck.rows
        },
        tabla_usuario: {
          columnas: usuarioTableCheck.rows
        },
        usuario: {
          solicitado: req.user,
          encontrado_en_bd: userCheck.rows[0] || 'NO ENCONTRADO',
          total_comentarios: comentariosCheck.rows[0].total_comentarios
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Error en diagnóstico:', error);
    res.status(500).json({
      success: false,
      error: 'Error en diagnóstico',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    if (client) {
      client.release();
    }
  }
});

module.exports = router;