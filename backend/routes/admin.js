// backend/routes/admin.js - VERSIÓN COMPLETA Y CORREGIDA
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

// Middleware para verificar si es admin
const adminMiddleware = async (req, res, next) => {
  try {
    if (req.user.tipo !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Acceso denegado. Se requieren privilegios de administrador'
      });
    }
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Error de autenticación'
    });
  }
};

// Lista actualizada de tablas permitidas
const tablasPermitidas = [
  'usuario', 'vivienda', 'comentario', 'valoracion', 
  'region', 'comuna', 'aislante_muro', 'aislante_techo',
  'artefacto', 'artefacto_ahorro_precio', 'combustible', 
  'muros', 'precio_unitario', 'precio_unitario_pm',
  'tabla_valores', 'techo', 'ventana',
  'muro_solucion', 'techo_solucion', 'ventana_solucion',
  'evaluacion_calefaccion', 'evaluacion_agua'
];

// GET /api/admin/valoraciones - Obtener todas las valoraciones para admin
router.get('/valoraciones', authMiddleware, adminMiddleware, async (req, res) => {
  let client;
  try {
    client = await pool.connect();
    
    const result = await client.query(`
      SELECT 
        v.id,
        v.valor,
        v.feedback,
        v.fecha,
        v.id_usuario,
        u.nombre_completo,
        u.correo
      FROM valoracion v 
      JOIN usuario u ON v.id_usuario = u.id 
      ORDER BY v.fecha DESC, v.id DESC
    `);

    console.log('⭐ Valoraciones cargadas:', result.rows.length);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('❌ Error obteniendo valoraciones:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener valoraciones',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    if (client) client.release();
  }
});

// GET /api/admin/tablas/:tabla - Obtener datos de una tabla específica
router.get('/tablas/:tabla', authMiddleware, adminMiddleware, async (req, res) => {
  let client;
  try {
    const { tabla } = req.params;
    
    console.log('📋 Solicitando datos de tabla:', tabla);

    if (!tablasPermitidas.includes(tabla)) {
      return res.status(400).json({
        success: false,
        error: 'Tabla no permitida'
      });
    }

    client = await pool.connect();
    
    // Primero verificar si la tabla existe
    const existeTabla = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = $1
      )
    `, [tabla]);

    if (!existeTabla.rows[0].exists) {
      return res.status(404).json({
        success: false,
        error: `La tabla ${tabla} no existe en la base de datos`
      });
    }

    // Obtener columnas
    const columnasResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = $1 AND table_schema = 'public'
      ORDER BY ordinal_position
    `, [tabla]);
    
    const columnas = columnasResult.rows.map(row => row.column_name);
    
    if (columnas.length === 0) {
      return res.status(404).json({
        success: false,
        error: `No se encontraron columnas para la tabla ${tabla}`
      });
    }

    // Para la mayoría de las tablas, usar SELECT simple
    let query = `SELECT * FROM ${tabla} ORDER BY id DESC LIMIT 100`;
    
    // Tablas especiales que requieren joins
    const tablasConJoins = [
      'vivienda', 'valoracion', 'comentario', 'muro_solucion', 
      'techo_solucion', 'ventana_solucion', 'evaluacion_calefaccion', 'evaluacion_agua'
    ];
    
    if (!tablasConJoins.includes(tabla)) {
      console.log('🔍 Ejecutando query simple:', query);
      const datosResult = await client.query(query);
      
      res.json({
        success: true,
        data: {
          columnas: columnas,
          registros: datosResult.rows  // CAMBIADO: registros en lugar de data
        }
      });
      return;
    }

    // Consultas específicas para tablas con joins
    let customQuery;
    switch(tabla) {
      case 'vivienda':
        customQuery = `
          SELECT 
            v.id_vivienda,
            v.id_usuario,
            v.region,
            v.superficie_1,
            v.superficie_2, 
            v.cantidad_personas,
            v.comuna,
            u.nombre_completo as nombre_usuario,
            r.nombre as nombre_region,
            c.nombre as nombre_comuna
          FROM vivienda v
          LEFT JOIN usuario u ON v.id_usuario = u.id
          LEFT JOIN region r ON v.region = r.nombre
          LEFT JOIN comuna c ON v.comuna = c.id
          ORDER BY v.id_vivienda DESC
          LIMIT 100
        `;
        break;
      
      case 'valoracion':
        customQuery = `
          SELECT 
            v.*,
            u.nombre_completo,
            u.correo
          FROM valoracion v
          LEFT JOIN usuario u ON v.id_usuario = u.id
          ORDER BY v.fecha DESC
          LIMIT 100
        `;
        break;
      
      case 'comentario':
        customQuery = `
          SELECT 
            c.*,
            u.nombre_completo,
            u.correo
          FROM comentario c
          LEFT JOIN usuario u ON c.id_usuario = u.id
          ORDER BY c.fecha DESC
          LIMIT 100
        `;
        break;
      
      case 'muro_solucion':
        customQuery = `
          SELECT 
            ms.*,
            am.elemento as nombre_aislante,
            pu.nombre as precio_unitario_nombre
          FROM muro_solucion ms
          LEFT JOIN aislante_muro am ON ms.id_aislante_muro = am.id
          LEFT JOIN precio_unitario pu ON ms.id_precio_unitario = pu.id
          ORDER BY ms.id DESC
          LIMIT 100
        `;
        break;
      
      case 'techo_solucion':
        customQuery = `
          SELECT 
            ts.*,
            at.elemento as nombre_aislante,
            pu.nombre as precio_unitario_nombre
          FROM techo_solucion ts
          LEFT JOIN aislante_techo at ON ts.id_aislante_techo = at.id
          LEFT JOIN precio_unitario pu ON ts.id_precio_unitario = pu.id
          ORDER BY ts.id DESC
          LIMIT 100
        `;
        break;
      
      case 'ventana_solucion':
        customQuery = `
          SELECT 
            vs.*,
            v1.elemento as ventana_original,
            v2.elemento as ventana_solucion
          FROM ventana_solucion vs
          LEFT JOIN ventana v1 ON vs.id_ventana = v1.id
          LEFT JOIN ventana v2 ON vs.id_ventana_solucion = v2.id
          ORDER BY vs.id DESC
          LIMIT 100
        `;
        break;
      
      case 'evaluacion_calefaccion':
        customQuery = `
          SELECT 
            ec.*,
            u.nombre_completo,
            u.correo
          FROM evaluacion_calefaccion ec
          LEFT JOIN usuario u ON ec.id_usuario = u.id
          ORDER BY ec.fecha_creacion DESC
          LIMIT 100
        `;
        break;
      
      case 'evaluacion_agua':
        customQuery = `
          SELECT 
            ea.*,
            u.nombre_completo,
            u.correo
          FROM evaluacion_agua ea
          LEFT JOIN usuario u ON ea.id_usuario = u.id
          ORDER BY ea.id DESC
          LIMIT 100
        `;
        break;
      
      default:
        customQuery = `SELECT * FROM ${tabla} ORDER BY id DESC LIMIT 100`;
    }
    
    console.log('🔍 Ejecutando query para tabla', tabla);
    const datosResult = await client.query(customQuery);
    
    console.log(`✅ Datos de tabla ${tabla}:`, {
      columnas: columnas.length,
      registros: datosResult.rows.length
    });

    res.json({
      success: true,
      data: {
        columnas: columnas,
        registros: datosResult.rows  // CAMBIADO: registros en lugar de data
      }
    });
    
  } catch (error) {
    console.error('❌ Error obteniendo datos de tabla:', error);
    
    let errorMessage = 'Error al obtener datos de la tabla';
    if (error.code === '42P01') {
      errorMessage = `La tabla ${req.params.tabla} no existe en la base de datos`;
    } else if (error.code === '42703') {
      errorMessage = 'Error en la estructura de la tabla - alguna columna no existe';
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
// PUT /api/admin/tablas/:tabla/:id - Actualizar registro
router.put('/tablas/:tabla/:id', authMiddleware, adminMiddleware, async (req, res) => {
  let client;
  try {
    const { tabla, id } = req.params;
    const datos = req.body;

    console.log(`📝 Actualizando registro en ${tabla}:`, { id, datos });

    if (!tablasPermitidas.includes(tabla)) {
      return res.status(400).json({
        success: false,
        error: 'Tabla no permitida'
      });
    }

    client = await pool.connect();

    // Construir query dinámicamente
    const campos = Object.keys(datos).filter(campo => 
      campo !== 'id' && campo !== 'nombre_usuario' && campo !== 'nombre_completo' && campo !== 'correo' &&
      campo !== 'nombre_region' && campo !== 'nombre_comuna'  // Excluir campos de join
    );
    
    if (campos.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No hay campos válidos para actualizar'
      });
    }

    // PROCESAMIENTO ESPECIAL PARA TABLA VIVIENDA
    let datosProcesados = { ...datos };
    
    if (tabla === 'vivienda') {
      // Procesar región - convertir ID a nombre si es necesario
      if (datosProcesados.region !== undefined && datosProcesados.region !== null) {
        if (typeof datosProcesados.region === 'number') {
          // Si se envía un número (ID), convertirlo a nombre de región
          const regionResult = await client.query(
            'SELECT nombre FROM region WHERE id = $1',
            [datosProcesados.region]
          );
          if (regionResult.rows.length === 0) {
            return res.status(400).json({
              success: false,
              error: 'El ID de región no existe'
            });
          }
          datosProcesados.region = regionResult.rows[0].nombre;
        } else if (typeof datosProcesados.region === 'string') {
          // Si se envía un string, verificar que sea un nombre válido
          const regionResult = await client.query(
            'SELECT nombre FROM region WHERE nombre = $1',
            [datosProcesados.region]
          );
          if (regionResult.rows.length === 0) {
            return res.status(400).json({
              success: false,
              error: 'El nombre de región no existe'
            });
          }
        }
      }
      
      // Validar comuna
      if (datosProcesados.comuna !== undefined && datosProcesados.comuna !== null) {
        const comunaResult = await client.query(
          'SELECT id FROM comuna WHERE id = $1',
          [datosProcesados.comuna]
        );
        if (comunaResult.rows.length === 0) {
          return res.status(400).json({
            success: false,
            error: 'La comuna especificada no existe'
          });
        }
      }
    }

    const sets = campos.map((campo, index) => `${campo} = $${index + 1}`);
    const values = campos.map(campo => {
      const valor = datosProcesados[campo];
      // Manejar valores null/undefined/string vacío
      if (valor === null || valor === undefined || valor === '') {
        return null;
      }
      return valor;
    });
    
    // Determinar la columna ID según la tabla
    let columnaId = 'id';
    let idValue = id;
    
    if (tabla === 'vivienda') {
      columnaId = 'id_vivienda';
    }
    
    values.push(idValue);

    const query = `UPDATE ${tabla} SET ${sets.join(', ')} WHERE ${columnaId} = $${values.length} RETURNING *`;

    console.log('🔍 Query de actualización:', query);
    console.log('🔍 Valores:', values);

    const result = await client.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Registro no encontrado'
      });
    }

    console.log('✅ Registro actualizado:', result.rows[0]);

    res.json({
      success: true,
      message: 'Registro actualizado exitosamente',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('❌ Error actualizando registro:', error);
    
    let errorMessage = 'Error al actualizar registro';
    if (error.code === '23505') {
      errorMessage = 'Violación de unicidad - ya existe un registro con estos datos';
    } else if (error.code === '23503') {
      errorMessage = 'Violación de clave foránea - Verifique que los IDs referenciados existan';
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

// POST /api/admin/tablas/:tabla - Crear registro
router.post('/tablas/:tabla', authMiddleware, adminMiddleware, async (req, res) => {
  let client;
  try {
    const { tabla } = req.params;
    const datos = req.body;

    console.log(`➕ Creando registro en ${tabla}:`, datos);

    if (!tablasPermitidas.includes(tabla)) {
      return res.status(400).json({
        success: false,
        error: 'Tabla no permitida'
      });
    }

    client = await pool.connect();

    // Procesar datos según la tabla
    let datosProcesados = { ...datos };
    
    // Convertir campos numéricos
    const camposNumericos = [
      'id_aislante_muro', 'id_aislante_techo', 'id_precio_unitario',
      'id_ventana', 'id_ventana_solucion', 'r_solucion', 'precio_m2',
      'uvidrio', 'umarco', 'valor_ventana_solucion'
    ];
    
    camposNumericos.forEach(campo => {
      if (datosProcesados[campo] !== undefined && datosProcesados[campo] !== '') {
        datosProcesados[campo] = parseFloat(datosProcesados[campo]);
      }
    });

    // Para muro_solucion y techo_solucion, el campo id es auto-generado
    // No debemos incluirlo en la inserción
    if (tabla === 'muro_solucion' || tabla === 'techo_solucion') {
      delete datosProcesados.id;
    }

    // Validaciones específicas por tabla
    if (tabla === 'muro_solucion') {
      if (!datosProcesados.id_aislante_muro || !datosProcesados.id_precio_unitario || !datosProcesados.solucion) {
        return res.status(400).json({
          success: false,
          error: 'Para muro_solucion se requieren: id_aislante_muro, id_precio_unitario y solucion'
        });
      }
    }

    if (tabla === 'techo_solucion') {
      if (!datosProcesados.id_aislante_techo || !datosProcesados.id_precio_unitario || !datosProcesados.solucion) {
        return res.status(400).json({
          success: false,
          error: 'Para techo_solucion se requieren: id_aislante_techo, id_precio_unitario y solucion'
        });
      }
    }

    // Filtrar campos vacíos
    const camposFiltrados = Object.keys(datosProcesados).filter(campo => 
      datosProcesados[campo] !== '' && datosProcesados[campo] !== null && datosProcesados[campo] !== undefined
    );
    
    if (camposFiltrados.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No hay datos válidos para crear el registro'
      });
    }

    const valores = camposFiltrados.map(campo => datosProcesados[campo]);
    const placeholders = camposFiltrados.map((_, index) => `$${index + 1}`);

    const query = `INSERT INTO ${tabla} (${camposFiltrados.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`;

    console.log('🔍 Query de inserción:', query);
    console.log('🔍 Valores:', valores);

    const result = await client.query(query, valores);

    console.log('✅ Registro creado:', result.rows[0]);

    res.status(201).json({
      success: true,
      message: 'Registro creado exitosamente',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('❌ Error creando registro:', error);
    
    let errorMessage = 'Error al crear registro';
    if (error.code === '23505') {
      errorMessage = 'Ya existe un registro con estos datos';
    } else if (error.code === '23503') {
      errorMessage = 'Error de referencia - Verifique que los IDs referenciados existan';
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

// DELETE /api/admin/tablas/:tabla/:id - Eliminar registro
router.delete('/tablas/:tabla/:id', authMiddleware, adminMiddleware, async (req, res) => {
  let client;
  try {
    const { tabla, id } = req.params;

    console.log(`🗑️ Eliminando registro de ${tabla}:`, id);

    if (!tablasPermitidas.includes(tabla)) {
      return res.status(400).json({
        success: false,
        error: 'Tabla no permitida'
      });
    }

    client = await pool.connect();

    // Para muro_solucion y techo_solucion, usar el campo id único
    let columnaId = 'id';
    let idValue = id;

    if (tabla === 'vivienda') {
      columnaId = 'id_vivienda';
    }

    const query = `DELETE FROM ${tabla} WHERE ${columnaId} = $1 RETURNING *`;
    
    console.log('🔍 Query de eliminación:', query);

    const result = await client.query(query, [idValue]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Registro no encontrado'
      });
    }

    console.log('✅ Registro eliminado:', result.rows[0]);

    res.json({
      success: true,
      message: 'Registro eliminado exitosamente',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('❌ Error eliminando registro:', error);
    
    let errorMessage = 'Error al eliminar registro';
    if (error.code === '23503') {
      errorMessage = 'No se puede eliminar el registro porque tiene referencias en otras tablas';
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

// GET /api/admin/usuarios - Obtener todos los usuarios
router.get('/usuarios', authMiddleware, adminMiddleware, async (req, res) => {
  let client;
  try {
    client = await pool.connect();
    
    const result = await client.query(
      `SELECT id, correo, nombre_completo, tipo_usuario, fecha_registro 
       FROM usuario 
       ORDER BY fecha_registro DESC`
    );

    console.log('👥 Usuarios obtenidos:', result.rows.length);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('❌ Error obteniendo usuarios:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener usuarios',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    if (client) client.release();
  }
});

// PUT /api/admin/usuarios/:id - Actualizar usuario
router.put('/usuarios/:id', authMiddleware, adminMiddleware, async (req, res) => {
  let client;
  try {
    const { id } = req.params;
    const { correo, nombre_completo, tipo_usuario, nueva_contraseña } = req.body;

    console.log('📝 Actualizando usuario:', { id, correo, nombre_completo, tipo_usuario });

    client = await pool.connect();

    // Verificar que el usuario existe
    const usuarioExistente = await client.query(
      'SELECT id FROM usuario WHERE id = $1',
      [id]
    );

    if (usuarioExistente.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    // Construir query dinámicamente
    let query = 'UPDATE usuario SET ';
    const values = [];
    let paramCount = 1;
    const updates = [];

    if (correo) {
      updates.push(`correo = $${paramCount}`);
      values.push(correo);
      paramCount++;
    }

    if (nombre_completo) {
      updates.push(`nombre_completo = $${paramCount}`);
      values.push(nombre_completo);
      paramCount++;
    }

    if (tipo_usuario) {
      updates.push(`tipo_usuario = $${paramCount}`);
      values.push(tipo_usuario);
      paramCount++;
    }

    if (nueva_contraseña) {
      const bcrypt = require('bcryptjs');
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(nueva_contraseña, saltRounds);
      updates.push(`"contraseña" = $${paramCount}`);
      values.push(hashedPassword);
      paramCount++;
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No hay campos para actualizar'
      });
    }

    query += updates.join(', ') + ` WHERE id = $${paramCount} RETURNING id, correo, nombre_completo, tipo_usuario`;
    values.push(id);

    const result = await client.query(query, values);

    console.log('✅ Usuario actualizado:', result.rows[0]);

    res.json({
      success: true,
      message: 'Usuario actualizado exitosamente',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('❌ Error actualizando usuario:', error);
    
    let errorMessage = 'Error al actualizar usuario';
    if (error.code === '23505') {
      errorMessage = 'El correo electrónico ya está en uso';
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

// DELETE /api/admin/usuarios/:id - Eliminar usuario
router.delete('/usuarios/:id', authMiddleware, adminMiddleware, async (req, res) => {
  let client;
  try {
    const { id } = req.params;

    console.log('🗑️ Eliminando usuario ID:', id);

    // Prevenir que un admin se elimine a sí mismo
    if (parseInt(id) === req.user.userId) {
      return res.status(400).json({
        success: false,
        error: 'No puedes eliminar tu propio usuario'
      });
    }

    client = await pool.connect();

    const result = await client.query(
      'DELETE FROM usuario WHERE id = $1 RETURNING id, correo',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    console.log('✅ Usuario eliminado:', result.rows[0]);

    res.json({
      success: true,
      message: 'Usuario eliminado exitosamente',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('❌ Error eliminando usuario:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar usuario',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    if (client) client.release();
  }
});

// GET /api/admin/comentarios - Obtener todos los comentarios para admin
router.get('/comentarios', authMiddleware, adminMiddleware, async (req, res) => {
  let client;
  try {
    client = await pool.connect();
    
    // Obtener todos los comentarios
    const comentariosResult = await client.query(`
      SELECT 
        c.id,
        c.tipo,
        c.descripcion,
        c.fecha,
        c.id_usuario,
        u.nombre_completo,
        u.correo
      FROM comentario c 
      JOIN usuario u ON c.id_usuario = u.id 
      ORDER BY c.fecha DESC, c.id DESC
    `);

    // Obtener estadísticas por tipo de comentario
    const estadisticasResult = await client.query(`
      SELECT 
        tipo,
        COUNT(*) as cantidad
      FROM comentario 
      GROUP BY tipo
      ORDER BY cantidad DESC
    `);

    // Obtener comentarios de la última semana
    const ultimaSemanaResult = await client.query(`
      SELECT COUNT(*) as cantidad
      FROM comentario 
      WHERE fecha >= CURRENT_DATE - INTERVAL '7 days'
    `);

    // Convertir las estadísticas por tipo a un objeto
    const porTipo = {};
    estadisticasResult.rows.forEach(row => {
      porTipo[row.tipo] = parseInt(row.cantidad);
    });

    console.log('📊 Comentarios cargados:', comentariosResult.rows.length);
    console.log('📈 Estadísticas por tipo:', porTipo);

    res.json({
      success: true,
      data: {
        comentarios: comentariosResult.rows,
        estadisticas: {
          total: comentariosResult.rows.length,
          porTipo: porTipo,
          ultimaSemana: parseInt(ultimaSemanaResult.rows[0].cantidad) || 0
        }
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo comentarios:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener comentarios',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    if (client) client.release();
  }
});

// GET /api/admin/estadisticas - Obtener estadísticas generales del sistema CORREGIDO
router.get('/estadisticas', authMiddleware, adminMiddleware, async (req, res) => {
  let client;
  try {
    client = await pool.connect();

    // Obtener estadísticas de usuarios
    const usuariosStats = await client.query(`
      SELECT 
        COUNT(*) as total_usuarios,
        COUNT(CASE WHEN tipo_usuario = 'admin' THEN 1 END) as administradores,
        COUNT(CASE WHEN tipo_usuario = 'usuario' THEN 1 END) as usuarios,
        COUNT(CASE WHEN fecha_registro >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as nuevos_ultima_semana
      FROM usuario
    `);

    // Obtener estadísticas de comentarios
    const comentariosStats = await client.query(`
      SELECT 
        COUNT(*) as total_comentarios,
        COUNT(CASE WHEN fecha >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as comentarios_ultima_semana
      FROM comentario
    `);

    // Obtener estadísticas de valoraciones CORREGIDO
    const valoracionesStats = await client.query(`
      SELECT 
        COUNT(*) as total_valoraciones,
        AVG(valor::numeric) as promedio_valoraciones,
        COUNT(CASE WHEN fecha >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as valoraciones_ultima_semana
      FROM valoracion
    `);

    // Obtener estadísticas de evaluaciones CORREGIDO
    const evaluacionesStats = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM evaluacion_calefaccion) as calefaccion,
        (SELECT COUNT(*) FROM evaluacion_agua) as agua
    `);

    const estadisticas = {
      usuarios: usuariosStats.rows[0],
      comentarios: comentariosStats.rows[0],
      valoraciones: valoracionesStats.rows[0],
      evaluaciones: evaluacionesStats.rows[0]
    };

    console.log('📈 Estadísticas generales:', estadisticas);

    res.json({
      success: true,
      data: estadisticas
    });

  } catch (error) {
    console.error('❌ Error obteniendo estadísticas:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener estadísticas',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    if (client) client.release();
  }
});

// GET /api/admin/estadisticas/usuarios-region
// GET /api/admin/estadisticas/usuarios-region - CORREGIDO
router.get('/estadisticas/usuarios-region', authMiddleware, adminMiddleware, async (req, res) => {
  let client;
  try {
    client = await pool.connect();
    
    const result = await client.query(`
      SELECT 
        r.nombre as region,
        COUNT(DISTINCT v.id_usuario) as cantidad
      FROM vivienda v
      JOIN region r ON v.region = r.nombre
      WHERE v.region IS NOT NULL
      GROUP BY r.nombre, r.id
      ORDER BY cantidad DESC
      LIMIT 10
    `);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Error obteniendo usuarios por región:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener estadísticas de región'
    });
  } finally {
    if (client) client.release();
  }
});

// GET /api/admin/estadisticas/evaluaciones-tipo
router.get('/estadisticas/evaluaciones-tipo', authMiddleware, adminMiddleware, async (req, res) => {
  let client;
  try {
    client = await pool.connect();
    
    const calefaccionResult = await client.query('SELECT COUNT(*) as total FROM evaluacion_calefaccion');
    const aguaResult = await client.query('SELECT COUNT(*) as total FROM evaluacion_agua');

    res.json({
      success: true,
      data: {
        calefaccion: parseInt(calefaccionResult.rows[0].total),
        agua: parseInt(aguaResult.rows[0].total)
      }
    });

  } catch (error) {
    console.error('Error obteniendo evaluaciones por tipo:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener estadísticas de evaluaciones'
    });
  } finally {
    if (client) client.release();
  }
});

// GET /api/admin/estadisticas/ahorro-promedio
router.get('/estadisticas/ahorro-promedio', authMiddleware, adminMiddleware, async (req, res) => {
  let client;
  try {
    client = await pool.connect();
    
    const result = await client.query(`
      SELECT 
        'Calefacción' as tipo,
        AVG(ahorroanual) as ahorro
      FROM evaluacion_calefaccion
      WHERE ahorroanual > 0
      UNION ALL
      SELECT 
        'Agua' as tipo,
        AVG(ahorro_dinero) as ahorro
      FROM evaluacion_agua
      WHERE ahorro_dinero > 0
    `);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Error obteniendo ahorro promedio:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener estadísticas de ahorro'
    });
  } finally {
    if (client) client.release();
  }
});

// GET /api/admin/estadisticas/valoraciones-distribucion
router.get('/estadisticas/valoraciones-distribucion', authMiddleware, adminMiddleware, async (req, res) => {
  let client;
  try {
    client = await pool.connect();
    
    const result = await client.query(`
      SELECT 
        valor,
        COUNT(*) as cantidad
      FROM valoracion
      GROUP BY valor
      ORDER BY valor
    `);

    // Crear array con distribución completa (1-5 estrellas)
    const distribucion = [0, 0, 0, 0, 0];
    result.rows.forEach(row => {
      if (row.valor >= 1 && row.valor <= 5) {
        distribucion[row.valor - 1] = parseInt(row.cantidad);
      }
    });

    res.json({
      success: true,
      data: distribucion
    });

  } catch (error) {
    console.error('Error obteniendo distribución de valoraciones:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener distribución de valoraciones'
    });
  } finally {
    if (client) client.release();
  }
});

// GET /api/admin/estadisticas/dashboard - Datos completos para el dashboard CORREGIDO
router.get('/estadisticas/dashboard', authMiddleware, adminMiddleware, async (req, res) => {
  let client;
  try {
    client = await pool.connect();

    // 1. Usuarios por región - CORREGIDO
    const usuariosRegion = await client.query(`
      SELECT 
        v.region,
        COUNT(DISTINCT v.id_usuario) as cantidad
      FROM vivienda v
      WHERE v.region IS NOT NULL
      GROUP BY v.region
      ORDER BY cantidad DESC
      LIMIT 8
    `);

    // 2. Evaluaciones por tipo - CORREGIDO
    const evaluacionesTipo = await client.query(`
      SELECT 
        'calefaccion' as tipo,
        COUNT(*) as cantidad
      FROM evaluacion_calefaccion
      UNION ALL
      SELECT 
        'agua' as tipo,
        COUNT(*) as cantidad
      FROM evaluacion_agua
    `);

    // 3. Ahorro promedio - CORREGIDO
    const ahorroPromedio = await client.query(`
      SELECT 
        'Calefacción' as tipo,
        AVG(ahorroanual) as ahorro
      FROM evaluacion_calefaccion
      WHERE ahorroanual > 0
      UNION ALL
      SELECT 
        'Agua' as tipo,
        AVG(ahorro_dinero) as ahorro
      FROM evaluacion_agua
      WHERE ahorro_dinero > 0
    `);

    // 4. Distribución de valoraciones - CORREGIDO
    const distribucionValoraciones = await client.query(`
      SELECT 
        valor,
        COUNT(*) as cantidad
      FROM valoracion
      GROUP BY valor
      ORDER BY valor
    `);

    // 5. Medidas más recomendadas - CORREGIDO para tu estructura de BD
    const medidasRecomendadas = await client.query(`
      SELECT 
        'Aislamiento Muro' as medida,
        COUNT(*) as cantidad
      FROM evaluacion_calefaccion
      WHERE id_solucion_muro1 IS NOT NULL OR id_solucion_muro2 IS NOT NULL
      UNION ALL
      SELECT 
        'Aislamiento Techo' as medida,
        COUNT(*) as cantidad
      FROM evaluacion_calefaccion
      WHERE id_solucion_techo IS NOT NULL
      UNION ALL
      SELECT 
        'Cambio Ventanas' as medida,
        COUNT(*) as cantidad
      FROM evaluacion_calefaccion
      WHERE id_solucion_ventana IS NOT NULL
      UNION ALL
      SELECT 
        'Artefactos Eficientes' as medida,
        COUNT(*) as cantidad
      FROM evaluacion_agua
      WHERE medida_ducha IS NOT NULL OR medida_lavamanos IS NOT NULL OR medida_wc IS NOT NULL OR medida_lavaplatos IS NOT NULL
      ORDER BY cantidad DESC
      LIMIT 5
    `);

    // 6. Datos de adopción - Usuarios activos por mes (últimos 6 meses)
    const adopcionData = await client.query(`
      SELECT 
        TO_CHAR(fecha_registro, 'YYYY-MM') as mes,
        COUNT(*) as nuevos_usuarios
      FROM usuario
      WHERE fecha_registro >= CURRENT_DATE - INTERVAL '6 months'
      GROUP BY TO_CHAR(fecha_registro, 'YYYY-MM')
      ORDER BY mes
    `);

    // Procesar datos de adopción
    const meses = [];
    const mau = [];
    
    adopcionData.rows.forEach(row => {
      meses.push(row.mes);
      mau.push(parseInt(row.nuevos_usuarios));
    });

    // Convertir datos
    const evaluacionesPorTipo = {};
    evaluacionesTipo.rows.forEach(row => {
      evaluacionesPorTipo[row.tipo] = parseInt(row.cantidad);
    });

    const distribucionVal = [0, 0, 0, 0, 0];
    distribucionValoraciones.rows.forEach(row => {
      if (row.valor >= 1 && row.valor <= 5) {
        distribucionVal[row.valor - 1] = parseInt(row.cantidad);
      }
    });

    res.json({
      success: true,
      data: {
        usuariosRegion: usuariosRegion.rows,
        evaluacionesTipo: evaluacionesPorTipo,
        ahorroPromedio: ahorroPromedio.rows,
        distribucionValoraciones: distribucionVal,
        medidasRecomendadas: medidasRecomendadas.rows,
        adopcion: {
          meses: meses,
          mau: mau
        }
      }
    });

  } catch (error) {
    console.error('Error obteniendo datos del dashboard:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener datos del dashboard',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    if (client) client.release();
  }
});

// Agrega estas rutas al archivo backend/routes/admin.js

// GET /api/admin/estadisticas/dashboard-completo - Datos completos y corregidos para el dashboard
// GET /api/admin/estadisticas/dashboard-completo-mejorado
router.get('/estadisticas/dashboard-completo-mejorado', authMiddleware, adminMiddleware, async (req, res) => {
  let client;
  try {
    client = await pool.connect();

    // Ejecutar todas las consultas en paralelo para mejor performance
    const [
      metricasPrincipales,
      usuariosRegion,
      distribucionValoraciones,
      ahorroPromedio,
      medidasRecomendadas,
      adopcionData,
      usoSistema,
      eficienciaMedidas
    ] = await Promise.all([
      // Métricas principales
      client.query(`
        SELECT 
          (SELECT COUNT(*) FROM usuario) as total_usuarios,
          ((SELECT COUNT(*) FROM evaluacion_calefaccion) + 
           (SELECT COUNT(*) FROM evaluacion_agua)) as total_evaluaciones,
          (SELECT COUNT(*) FROM comentario) as total_comentarios,
          (SELECT AVG(valor::numeric) FROM valoracion) as valoracion_promedio,
          (SELECT COUNT(*) FROM evaluacion_calefaccion) as evaluaciones_calefaccion,
          (SELECT COUNT(*) FROM evaluacion_agua) as evaluaciones_agua,
          (SELECT COUNT(DISTINCT id_usuario) FROM evaluacion_calefaccion) as usuarios_calefaccion,
          (SELECT COUNT(DISTINCT id_usuario) FROM evaluacion_agua) as usuarios_agua
      `),
      
      // Usuarios por región
      client.query(`
        SELECT 
          r.nombre as region,
          COUNT(DISTINCT v.id_usuario) as cantidad
        FROM vivienda v
        JOIN region r ON v.region = r.nombre
        WHERE v.region IS NOT NULL
        GROUP BY r.nombre, r.id
        ORDER BY cantidad DESC
        LIMIT 8
      `),
      
      // Distribución de valoraciones
      client.query(`
        SELECT 
          valor,
          COUNT(*) as cantidad
        FROM valoracion
        GROUP BY valor
        ORDER BY valor
      `),
      
      // Ahorro promedio
      client.query(`
        SELECT 
          'Calefacción' as tipo,
          COALESCE(AVG(ahorroanual), 0) as ahorro,
          COUNT(*) as cantidad_evaluaciones
        FROM evaluacion_calefaccion
        WHERE ahorroanual > 0
        UNION ALL
        SELECT 
          'Agua' as tipo,
          COALESCE(AVG(ahorro_dinero), 0) as ahorro,
          COUNT(*) as cantidad_evaluaciones
        FROM evaluacion_agua
        WHERE ahorro_dinero > 0
      `),
      
      // Medidas recomendadas
      client.query(`
        SELECT 
          ms.solucion as medida,
          COUNT(*) as cantidad
        FROM evaluacion_calefaccion ec
        JOIN muro_solucion ms ON ec.id_solucion_muro1 = ms.id OR ec.id_solucion_muro2 = ms.id
        WHERE ec.id_solucion_muro1 IS NOT NULL OR ec.id_solucion_muro2 IS NOT NULL
        GROUP BY ms.solucion
        ORDER BY cantidad DESC
        LIMIT 10
      `),
      
      // Datos de adopción
      client.query(`
        SELECT 
          TO_CHAR(fecha_registro, 'YYYY-MM') as mes,
          TO_CHAR(fecha_registro, 'Mon') as mes_corto,
          COUNT(*) as nuevos_usuarios
        FROM usuario
        WHERE fecha_registro >= CURRENT_DATE - INTERVAL '6 months'
        GROUP BY TO_CHAR(fecha_registro, 'YYYY-MM'), TO_CHAR(fecha_registro, 'Mon')
        ORDER BY mes
      `),
      
      // Uso del sistema
      client.query(`
        SELECT COUNT(DISTINCT id_usuario) as usuarios_activos
        FROM (
          SELECT id_usuario FROM evaluacion_calefaccion
          UNION 
          SELECT id_usuario FROM evaluacion_agua
        ) as usuarios_con_evaluaciones
      `),
      
      // Eficiencia de medidas
      client.query(`
        SELECT 
          'Aislamiento Muro' as tipo_medida,
          AVG(ec.payback) as retorno_promedio
        FROM evaluacion_calefaccion ec
        WHERE ec.id_solucion_muro1 IS NOT NULL OR ec.id_solucion_muro2 IS NOT NULL
        AND ec.payback > 0
        UNION ALL
        SELECT 
          'Aislamiento Techo' as tipo_medida,
          AVG(ec.payback) as retorno_promedio
        FROM evaluacion_calefaccion ec
        WHERE ec.id_solucion_techo IS NOT NULL
        AND ec.payback > 0
      `)
    ]);

    // Procesar datos
    const stats = metricasPrincipales.rows[0];
    const usuariosActivos = parseInt(usoSistema.rows[0].usuarios_activos) || 0;
    const tasaActivacion = stats.total_usuarios > 0 ? 
      (usuariosActivos / parseInt(stats.total_usuarios)) * 100 : 0;

    const distribucionVal = [0, 0, 0, 0, 0];
    distribucionValoraciones.rows.forEach(row => {
      if (row.valor >= 1 && row.valor <= 5) {
        distribucionVal[row.valor - 1] = parseInt(row.cantidad);
      }
    });

    const responseData = {
      metricasPrincipales: {
        total_usuarios: parseInt(stats.total_usuarios) || 0,
        total_evaluaciones: parseInt(stats.total_evaluaciones) || 0,
        total_comentarios: parseInt(stats.total_comentarios) || 0,
        valoracion_promedio: parseFloat(stats.valoracion_promedio) || 0,
        evaluaciones_calefaccion: parseInt(stats.evaluaciones_calefaccion) || 0,
        evaluaciones_agua: parseInt(stats.evaluaciones_agua) || 0,
        usuarios_activos: usuariosActivos,
        tasa_activacion: parseFloat(tasaActivacion.toFixed(1))
      },
      usuariosRegion: usuariosRegion.rows,
      distribucionValoraciones: distribucionVal,
      ahorroPromedio: ahorroPromedio.rows,
      medidasRecomendadas: medidasRecomendadas.rows,
      adopcion: {
        meses: adopcionData.rows.map(row => row.mes_corto),
        mau: adopcionData.rows.map(row => parseInt(row.nuevos_usuarios))
      },
      eficiencia: {
        retorno_inversion: eficienciaMedidas.rows
      }
    };

    console.log('📊 Dashboard mejorado cargado correctamente');
    
    res.json({
      success: true,
      data: responseData
    });

  } catch (error) {
    console.error('❌ Error en dashboard mejorado:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener datos del dashboard',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    if (client) client.release();
  }
});

// En backend/routes/admin.js - Endpoint de estadísticas filtradas
router.get('/estadisticas/filtradas', authMiddleware, adminMiddleware, async (req, res) => {
  let client;
  try {
    const { fechaInicio, fechaFin, region } = req.query;
    
    client = await pool.connect();

    // Construir condiciones WHERE dinámicamente
    let whereConditions = [];
    let queryParams = [];
    let paramCount = 1;

    if (fechaInicio) {
      whereConditions.push(`u.fecha_registro >= $${paramCount}`);
      queryParams.push(fechaInicio);
      paramCount++;
    }

    if (fechaFin) {
      whereConditions.push(`u.fecha_registro <= $${paramCount}`);
      queryParams.push(fechaFin);
      paramCount++;
    }

    if (region && region !== 'todas') {
      whereConditions.push(`v.region = $${paramCount}`);
      queryParams.push(region);
      paramCount++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Consulta para métricas principales con filtros
    const estadisticasFiltradas = await client.query(`
      SELECT 
        COUNT(DISTINCT u.id) as total_usuarios,
        (COUNT(DISTINCT ec.id) + COUNT(DISTINCT ea.id)) as total_evaluaciones,
        COUNT(DISTINCT c.id) as total_comentarios,
        COALESCE(AVG(val.valor::numeric), 0) as valoracion_promedio,
        COUNT(DISTINCT CASE WHEN ec.id IS NOT NULL OR ea.id IS NOT NULL THEN u.id END) as usuarios_activos
      FROM usuario u
      LEFT JOIN vivienda v ON u.id = v.id_usuario
      LEFT JOIN evaluacion_calefaccion ec ON u.id = ec.id_usuario
      LEFT JOIN evaluacion_agua ea ON u.id = ea.id_usuario
      LEFT JOIN comentario c ON u.id = c.id_usuario
      LEFT JOIN valoracion val ON u.id = val.id_usuario
      ${whereClause}
    `, queryParams);

    const stats = estadisticasFiltradas.rows[0];
    const totalUsuarios = parseInt(stats.total_usuarios) || 0;
    const usuariosActivos = parseInt(stats.usuarios_activos) || 0;
    const tasaActivacion = totalUsuarios > 0 ? (usuariosActivos / totalUsuarios) * 100 : 0;

    // Consultas adicionales para datos de gráficos con filtros
    let usuariosRegionQuery = `
      SELECT 
        v.region,
        COUNT(DISTINCT v.id_usuario) as cantidad
      FROM vivienda v
      WHERE v.region IS NOT NULL
    `;
    
    if (region && region !== 'todas') {
      usuariosRegionQuery += ` AND v.region = $${paramCount}`;
      queryParams.push(region);
    }
    
    usuariosRegionQuery += ` GROUP BY v.region ORDER BY cantidad DESC LIMIT 8`;

    const usuariosRegion = await client.query(usuariosRegionQuery, queryParams);

    // Consulta para distribución de valoraciones con filtros
    let valoracionesQuery = `
      SELECT 
        valor,
        COUNT(*) as cantidad
      FROM valoracion val
      JOIN usuario u ON val.id_usuario = u.id
      LEFT JOIN vivienda v ON u.id = v.id_usuario
      ${whereClause}
      GROUP BY valor
      ORDER BY valor
    `;
    
    const distribucionValoraciones = await client.query(valoracionesQuery, queryParams);

    // Consulta para ahorro promedio con filtros
    let ahorroQuery = `
      SELECT 
        'Calefacción' as tipo,
        COALESCE(AVG(ec.ahorroanual), 0) as ahorro,
        COUNT(*) as cantidad_evaluaciones
      FROM evaluacion_calefaccion ec
      JOIN usuario u ON ec.id_usuario = u.id
      LEFT JOIN vivienda v ON u.id = v.id_usuario
      WHERE ec.ahorroanual > 0
    `;
    
    if (whereClause) {
      ahorroQuery += ` AND ${whereConditions.join(' AND ')}`;
    }
    
    ahorroQuery += `
      UNION ALL
      SELECT 
        'Agua' as tipo,
        COALESCE(AVG(ea.ahorro_dinero), 0) as ahorro,
        COUNT(*) as cantidad_evaluaciones
      FROM evaluacion_agua ea
      JOIN usuario u ON ea.id_usuario = u.id
      LEFT JOIN vivienda v ON u.id = v.id_usuario
      WHERE ea.ahorro_dinero > 0
    `;
    
    if (whereClause) {
      ahorroQuery += ` AND ${whereConditions.join(' AND ')}`;
    }

    const ahorroPromedio = await client.query(ahorroQuery, queryParams);

    // Procesar distribución de valoraciones
    const distribucionVal = [0, 0, 0, 0, 0];
    distribucionValoraciones.rows.forEach(row => {
      if (row.valor >= 1 && row.valor <= 5) {
        distribucionVal[row.valor - 1] = parseInt(row.cantidad);
      }
    });

    const responseData = {
      metricasPrincipales: {
        total_usuarios: totalUsuarios,
        total_evaluaciones: parseInt(stats.total_evaluaciones) || 0,
        total_comentarios: parseInt(stats.total_comentarios) || 0,
        valoracion_promedio: parseFloat(stats.valoracion_promedio) || 0,
        usuarios_activos: usuariosActivos,
        tasa_activacion: parseFloat(tasaActivacion.toFixed(1))
      },
      usuariosRegion: usuariosRegion.rows,
      distribucionValoraciones: distribucionVal,
      ahorroPromedio: ahorroPromedio.rows,
      // Agregar más datos según sea necesario
    };

    res.json({
      success: true,
      data: responseData
    });

  } catch (error) {
    console.error('❌ Error obteniendo estadísticas filtradas:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener estadísticas filtradas'
    });
  } finally {
    if (client) client.release();
  }
});

// GET /api/admin/estadisticas/uso-sistema - Métricas de uso del sistema
router.get('/estadisticas/uso-sistema', authMiddleware, adminMiddleware, async (req, res) => {
  let client;
  try {
    client = await pool.connect();

    // Usuarios activos (que han realizado al menos una evaluación)
    const usuariosActivos = await client.query(`
      SELECT COUNT(DISTINCT id_usuario) as usuarios_activos
      FROM (
        SELECT id_usuario FROM evaluacion_calefaccion
        UNION 
        SELECT id_usuario FROM evaluacion_agua
      ) as usuarios_con_evaluaciones
    `);

    // Evaluaciones por mes (últimos 6 meses)
    const evaluacionesMensuales = await client.query(`
      SELECT 
        TO_CHAR(fecha_creacion, 'YYYY-MM') as mes,
        TO_CHAR(fecha_creacion, 'Mon') as mes_corto,
        COUNT(*) as cantidad
      FROM evaluacion_calefaccion
      WHERE fecha_creacion >= CURRENT_DATE - INTERVAL '6 months'
      GROUP BY TO_CHAR(fecha_creacion, 'YYYY-MM'), TO_CHAR(fecha_creacion, 'Mon')
      ORDER BY mes
    `);

    // Tipos de combustible más utilizados
    const combustiblesPopulares = await client.query(`
      SELECT 
        c.nombre as combustible,
        COUNT(*) as cantidad
      FROM evaluacion_calefaccion ec
      JOIN combustible c ON ec.id_combustible = c.id
      GROUP BY c.nombre
      ORDER BY cantidad DESC
      LIMIT 8
    `);

    // Ahorro promedio por región
    const ahorroPorRegion = await client.query(`
      SELECT 
        r.nombre as region,
        COUNT(DISTINCT ec.id) as evaluaciones,
        AVG(ec.ahorroanual) as ahorro_promedio
      FROM evaluacion_calefaccion ec
      JOIN usuario u ON ec.id_usuario = u.id
      JOIN vivienda v ON u.id = v.id_usuario
      JOIN region r ON v.region = r.nombre
      WHERE ec.ahorroanual > 0
      GROUP BY r.nombre, r.id
      ORDER BY ahorro_promedio DESC
      LIMIT 10
    `);

    res.json({
      success: true,
      data: {
        usuarios_activos: parseInt(usuariosActivos.rows[0].usuarios_activos) || 0,
        evaluaciones_mensuales: evaluacionesMensuales.rows,
        combustibles_populares: combustiblesPopulares.rows,
        ahorro_por_region: ahorroPorRegion.rows
      }
    });

  } catch (error) {
    console.error('Error obteniendo métricas de uso:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener métricas de uso'
    });
  } finally {
    if (client) client.release();
  }
});

// GET /api/admin/estadisticas/eficiencia-medidas - Eficiencia de las medidas
router.get('/estadisticas/eficiencia-medidas', authMiddleware, adminMiddleware, async (req, res) => {
  let client;
  try {
    client = await pool.connect();

    // Medidas de aislamiento más efectivas
    const medidasMuroEfectivas = await client.query(`
      SELECT 
        ms.solucion as medida,
        COUNT(*) as veces_recomendada,
        AVG(ec.ahorroanual) as ahorro_promedio
      FROM evaluacion_calefaccion ec
      JOIN muro_solucion ms ON ec.id_solucion_muro1 = ms.id OR ec.id_solucion_muro2 = ms.id
      WHERE ec.ahorroanual > 0
      GROUP BY ms.solucion
      ORDER BY ahorro_promedio DESC
      LIMIT 10
    `);

    // Medidas de techo más efectivas
    const medidasTechoEfectivas = await client.query(`
      SELECT 
        ts.solucion as medida,
        COUNT(*) as veces_recomendada,
        AVG(ec.ahorroanual) as ahorro_promedio
      FROM evaluacion_calefaccion ec
      JOIN techo_solucion ts ON ec.id_solucion_techo = ts.id
      WHERE ec.ahorroanual > 0
      GROUP BY ts.solucion
      ORDER BY ahorro_promedio DESC
      LIMIT 10
    `);

    // Retorno de inversión promedio por tipo de medida
    const retornoInversion = await client.query(`
      SELECT 
        'Aislamiento Muro' as tipo_medida,
        AVG(ec.payback) as retorno_promedio,
        COUNT(*) as cantidad
      FROM evaluacion_calefaccion ec
      WHERE ec.id_solucion_muro1 IS NOT NULL OR ec.id_solucion_muro2 IS NOT NULL
      AND ec.payback > 0
      
      UNION ALL
      
      SELECT 
        'Aislamiento Techo' as tipo_medida,
        AVG(ec.payback) as retorno_promedio,
        COUNT(*) as cantidad
      FROM evaluacion_calefaccion ec
      WHERE ec.id_solucion_techo IS NOT NULL
      AND ec.payback > 0
      
      UNION ALL
      
      SELECT 
        'Cambio Ventanas' as tipo_medida,
        AVG(ec.payback) as retorno_promedio,
        COUNT(*) as cantidad
      FROM evaluacion_calefaccion ec
      WHERE ec.id_solucion_ventana IS NOT NULL
      AND ec.payback > 0
      
      ORDER BY retorno_promedio
    `);

    res.json({
      success: true,
      data: {
        medidas_muro: medidasMuroEfectivas.rows,
        medidas_techo: medidasTechoEfectivas.rows,
        retorno_inversion: retornoInversion.rows
      }
    });

  } catch (error) {
    console.error('Error obteniendo eficiencia de medidas:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener eficiencia de medidas'
    });
  } finally {
    if (client) client.release();
  }
});

module.exports = router;