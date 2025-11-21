// backend/routes/auth.js - VERSIÓN CORREGIDA
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

// Agrega al inicio del archivo, después de los imports
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// Configuración DIRECTA de Gmail (más simple)
// CONFIGURACIÓN SMTP MEJORADA PARA RENDER
const createTransport = () => {
  return nodemailer.createTransporter({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    // Optimizado para entornos cloud
    pool: true,
    maxConnections: 3,
    maxMessages: 10,
    rateDelta: 2000,
    rateLimit: 3,
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 15000,
    // Para evitar problemas de TLS
    tls: {
      rejectUnauthorized: false
    }
  });
};

const transporter = createTransport();

// Función mejorada de verificación
const verificarConexionSMTP = async () => {
  try {
    console.log('🔧 Verificando configuración SMTP...');
    console.log('📧 Usuario:', process.env.SMTP_USER);
    console.log('🔑 Contraseña:', process.env.SMTP_PASS ? '✅ Presente' : '❌ Ausente');
    
    await transporter.verify();
    console.log('✅ Conexión SMTP con Gmail establecida correctamente');
    return true;
  } catch (error) {
    console.error('❌ Error en conexión SMTP:', error.message);
    console.error('🔧 Detalles del error:', {
      code: error.code,
      command: error.command
    });
    return false;
  }
};
// Llamar la verificación al iniciar (opcional)
verificarConexionSMTP();

// POST /api/auth/solicitar-reset-password - SOLICITAR CÓDIGO DE RECUPERACIÓN
router.post('/solicitar-reset-password', async (req, res) => {
  let client;
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'El email es obligatorio'
      });
    }

    client = await pool.connect();

    // Verificar si el usuario existe
    const usuarioResult = await client.query(
      'SELECT id, correo, nombre_completo FROM usuario WHERE correo = $1',
      [email]
    );

    // Por seguridad, no revelamos si el email existe o no
    if (usuarioResult.rows.length === 0) {
      return res.json({
        success: true,
        message: 'Si el email existe, recibirás un código de recuperación'
      });
    }

    const usuario = usuarioResult.rows[0];

    // Generar código de 6 dígitos
    const codigoRecuperacion = Math.floor(100000 + Math.random() * 900000).toString();
    const fechaExpiracion = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

    // Guardar código en la base de datos
    await client.query(
      'INSERT INTO codigos_recuperacion (id_usuario, codigo, fecha_expiracion) VALUES ($1, $2, $3)',
      [usuario.id, codigoRecuperacion, fechaExpiracion]
    );

    console.log(' ');
    console.log('📧 ==========================================');
    console.log('📧 CÓDIGO DE RECUPERACIÓN GENERADO');
    console.log('📧 Para:', usuario.correo);
    console.log('📧 Código:', codigoRecuperacion);
    console.log('📧 Expira:', fechaExpiracion.toLocaleTimeString());
    console.log('📧 ==========================================');
    console.log(' ');

    // ENVIAR EMAIL REAL CON GMAIL
    try {
      const info = await transporter.sendMail({
        from: process.env.SMTP_FROM || '"Kipus A+" <kipusaplus@gmail.com>',
        to: usuario.correo,
        subject: '🔐 Código de recuperación - Kipus A+',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h2 style="color: #2E7D32; margin: 0;">Kipus A+</h2>
              <p style="color: #666; margin: 5px 0;">Vivienda Sustentable - Universidad de Talca</p>
            </div>
            
            <h3 style="color: #333;">Recuperación de Contraseña</h3>
            <p>Hola <strong>${usuario.nombre_completo}</strong>,</p>
            <p>Has solicitado restablecer tu contraseña en Kipus A+. Usa el siguiente código para continuar:</p>
            
            <div style="background: linear-gradient(135deg, #2E7D32, #4CAF50); padding: 25px; text-align: center; margin: 30px 0; border-radius: 10px; color: white; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <div style="font-size: 14px; margin-bottom: 10px; opacity: 0.9;">TU CÓDIGO DE VERIFICACIÓN</div>
              <h1 style="color: white; margin: 0; font-size: 42px; letter-spacing: 10px; font-weight: bold;">
                ${codigoRecuperacion}
              </h1>
              <div style="font-size: 12px; margin-top: 10px; opacity: 0.8;">
                ⏰ Válido por 15 minutos
              </div>
            </div>
            
            <p style="color: #666; font-size: 14px;">
              <strong>📝 Instrucciones:</strong><br>
              1. Regresa a la página de recuperación de contraseña<br>
              2. Ingresa el código de 6 dígitos mostrado arriba<br>
              3. Crea tu nueva contraseña
            </p>
            
            <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #2E7D32;">
              <p style="margin: 0; color: #666; font-size: 12px;">
                <strong>⚠️ ¿No solicitaste este cambio?</strong><br>
                Si no fuiste tú, puedes ignorar este mensaje. Tu cuenta permanecerá segura.
              </p>
            </div>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <div style="text-align: center; color: #999; font-size: 12px;">
              <p>Equipo Kipus A+ Vivienda Sustentable<br>
              Universidad de Talca</p>
              <p>Este es un email automático, por favor no respondas a este mensaje.</p>
            </div>
          </div>
        `
      });

      console.log('✅ EMAIL ENVIADO CORRECTAMENTE A:', usuario.correo);
      console.log('📧 Message ID:', info.messageId);
      console.log('✅ El usuario debería recibir el email en su bandeja de entrada');

    } catch (emailError) {
      console.error('❌ ERROR ENVIANDO EMAIL:', emailError.message);
      console.log('📧 Código de recuperación (usa este manualmente):', codigoRecuperacion);
      
      // Aún así responder éxito porque el código se generó
    }

    res.json({
      success: true,
      message: 'Si el email existe, recibirás un código de recuperación'
    });

  } catch (error) {
    console.error('❌ Error en solicitud de reset:', error);
    res.status(500).json({
      success: false,
      error: 'Error al procesar la solicitud de recuperación'
    });
  } finally {
    if (client) {
      client.release();
    }
  }
});

// POST /api/auth/verificar-codigo - VERIFICAR CÓDIGO DE RECUPERACIÓN
router.post('/verificar-codigo', async (req, res) => {
  let client;
  try {
    const { email, codigo } = req.body;

    if (!email || !codigo) {
      return res.status(400).json({
        success: false,
        error: 'Email y código son obligatorios'
      });
    }

    client = await pool.connect();

    // Buscar usuario
    const usuarioResult = await client.query(
      'SELECT id FROM usuario WHERE correo = $1',
      [email]
    );

    if (usuarioResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Código inválido o expirado'
      });
    }

    const usuarioId = usuarioResult.rows[0].id;

    // Buscar código válido
    const codigoResult = await client.query(
      `SELECT id FROM codigos_recuperacion 
       WHERE id_usuario = $1 AND codigo = $2 AND fecha_expiracion > NOW() AND usado = false
       ORDER BY fecha_creacion DESC LIMIT 1`,
      [usuarioId, codigo]
    );

    if (codigoResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Código inválido o expirado'
      });
    }

    // Marcar código como usado
    await client.query(
      'UPDATE codigos_recuperacion SET usado = true WHERE id = $1',
      [codigoResult.rows[0].id]
    );

    // Generar token temporal para cambio de contraseña
    const tokenTemporal = jwt.sign(
      { 
        userId: usuarioId,
        email: email,
        tipo: 'password_reset'
      },
      process.env.JWT_SECRET || 'secreto-desarrollo',
      { expiresIn: '15m' } // 15 minutos
    );

    res.json({
      success: true,
      message: 'Código verificado correctamente',
      token: tokenTemporal
    });

  } catch (error) {
    console.error('❌ Error verificando código:', error);
    res.status(500).json({
      success: false,
      error: 'Error al verificar el código'
    });
  } finally {
    if (client) {
      client.release();
    }
  }
});

// POST /api/auth/cambiar-password - CAMBIAR CONTRASEÑA CON TOKEN TEMPORAL
router.post('/cambiar-password', async (req, res) => {
  let client;
  try {
    const { token, nuevaPassword } = req.body;

    if (!token || !nuevaPassword) {
      return res.status(400).json({
        success: false,
        error: 'Token y nueva contraseña son obligatorios'
      });
    }

    if (nuevaPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'La contraseña debe tener al menos 8 caracteres'
      });
    }

    // Verificar token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'secreto-desarrollo');
    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        error: 'Token inválido o expirado'
      });
    }

    if (decoded.tipo !== 'password_reset') {
      return res.status(401).json({
        success: false,
        error: 'Token inválido'
      });
    }

    client = await pool.connect();

    // Hash de la nueva contraseña
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(nuevaPassword, saltRounds);

    // Actualizar contraseña
    await client.query(
      'UPDATE usuario SET contraseña = $1 WHERE id = $2',
      [hashedPassword, decoded.userId]
    );

    // Invalidar todos los tokens de recuperación pendientes
    await client.query(
      'UPDATE codigos_recuperacion SET usado = true WHERE id_usuario = $1 AND usado = false',
      [decoded.userId]
    );

    console.log('✅ Contraseña actualizada para usuario ID:', decoded.userId);

    res.json({
      success: true,
      message: 'Contraseña actualizada correctamente'
    });

  } catch (error) {
    console.error('❌ Error cambiando contraseña:', error);
    res.status(500).json({
      success: false,
      error: 'Error al cambiar la contraseña'
    });
  } finally {
    if (client) {
      client.release();
    }
  }
});

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
      next();
    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        error: 'Token inválido o expirado'
      });
    }
  } catch (error) {
    return res.status(401).json({ 
      success: false,
      error: 'Error de autenticación' 
    });
  }
};


// POST /api/auth/registro - Registrar nuevo usuario
router.post('/registro', async (req, res) => {
  let client;
  try {
    const { email, password, nombre, region, comuna, personas, superficie1, superficie2 } = req.body;

    console.log('📝 Datos recibidos para registro:', { 
      email, 
      nombre, 
      region, 
      comuna, 
      personas, 
      superficie1, 
      superficie2 
    });

    // Validaciones
    if (!email || !password || !nombre || !region || !comuna || !personas || !superficie1) {
      return res.status(400).json({
        success: false,
        error: 'Todos los campos marcados con * son obligatorios'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'La contraseña debe tener al menos 8 caracteres'
      });
    }

    if (parseInt(personas) < 1) {
      return res.status(400).json({
        success: false,
        error: 'El número de personas debe ser al menos 1'
      });
    }

    if (parseFloat(superficie1) <= 0) {
      return res.status(400).json({
        success: false,
        error: 'La superficie del primer piso debe ser mayor a 0'
      });
    }

    // Asegurar que superficie2 tenga valor (0 si está vacío)
    const superficie2Valor = superficie2 || '0';

    client = await pool.connect();

    // Iniciar transacción
    await client.query('BEGIN');

    // Verificar si el correo ya existe
    const usuarioExistente = await client.query(
      'SELECT id FROM usuario WHERE correo = $1',
      [email]
    );

    if (usuarioExistente.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'El correo electrónico ya está registrado'
      });
    }

    // Hash de la contraseña
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 1. Insertar usuario en la tabla usuario
    const usuarioResult = await client.query(
      `INSERT INTO usuario (correo, nombre_completo, contraseña, tipo_usuario, fecha_registro) 
       VALUES ($1, $2, $3, $4, CURRENT_DATE) 
       RETURNING id, correo, nombre_completo`,
      [email, nombre, hashedPassword, 'usuario']
    );

    const usuarioId = usuarioResult.rows[0].id;

    console.log('✅ Usuario creado con ID:', usuarioId);

    // Verificar si la región existe (pero solo para validación)
    const regionResult = await client.query(
      'SELECT id, nombre FROM region WHERE nombre = $1',
      [region]
    );

    if (regionResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'La región seleccionada no existe'
      });
    }

    // Verificar si la comuna existe y pertenece a la región
    const comunaResult = await client.query(
      `SELECT c.id FROM comuna c 
       JOIN region r ON c.id_region = r.id 
       WHERE c.nombre = $1 AND r.nombre = $2`,
      [comuna, region]
    );

    if (comunaResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'La comuna seleccionada no existe o no pertenece a la región'
      });
    }

    // Log para debugging
    console.log('🔍 IDs obtenidos:', {
      regionNombre: region,
      comunaId: comunaResult.rows[0].id,
      comunaNombre: comuna
    });

    // 2. Insertar vivienda - VERSIÓN CORREGIDA (usar NOMBRE de región)
    const viviendaResult = await client.query(
      `INSERT INTO vivienda (id_usuario, region, comuna, cantidad_personas, superficie_1, superficie_2) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id_vivienda`,
      [
        usuarioId, 
        region,  // ← CORREGIDO: Usar el NOMBRE de la región (texto)
        comunaResult.rows[0].id,  // ← ID de comuna (número)
        parseInt(personas), 
        parseFloat(superficie1), 
        parseFloat(superficie2Valor)
      ]
    );

    console.log('✅ Vivienda creada con ID:', viviendaResult.rows[0].id_vivienda);

    // Generar token JWT
    const token = jwt.sign(
      { 
        userId: usuarioId, 
        email: email,
        tipo: 'usuario'
      },
      process.env.JWT_SECRET || 'secreto-desarrollo',
      { expiresIn: '7d' }
    );

    // Confirmar transacción
    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: '✅ Usuario registrado exitosamente',
      usuario: {
        id: usuarioId,
        correo: email,
        nombre_completo: nombre
      },
      vivienda: {
        id_vivienda: viviendaResult.rows[0].id_vivienda,
        cantidad_personas: parseInt(personas),
        superficie_1: parseFloat(superficie1),
        superficie_2: parseFloat(superficie2Valor)
      },
      token: token
    });

  } catch (error) {
    // Rollback en caso de error
    if (client) {
      await client.query('ROLLBACK');
    }
    
    console.error('❌ Error en registro:', error);
    
    let errorMessage = 'Error interno del servidor en el registro';
    
    if (error.code === '23505') { // Unique violation
      errorMessage = 'El correo electrónico ya está registrado';
    } else if (error.code === '23502') { // Not null violation
      errorMessage = 'Faltan campos obligatorios';
    } else if (error.code === '23503') { // Foreign key violation
      errorMessage = 'Error en los datos de región o comuna';
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

// POST /api/auth/login - Iniciar sesión (VERSIÓN CORREGIDA)
router.post('/login', async (req, res) => {
  let client;
  try {
    const { correo, contraseña } = req.body;

    console.log('🔐 Intento de login para:', correo);

    // Validaciones
    if (!correo || !contraseña) {
      return res.status(400).json({
        success: false,
        error: 'Correo y contraseña son obligatorios'
      });
    }

    client = await pool.connect();

    // ✅ CORREGIDO: Usar el nombre exacto del campo de la base de datos
    const usuarioResult = await client.query(
      'SELECT id, correo, nombre_completo, "contraseña", tipo_usuario FROM usuario WHERE LOWER(correo) = LOWER($1)',
      [correo.trim()]
    );

    console.log('👤 Usuario encontrado:', usuarioResult.rows.length > 0 ? 'Sí' : 'No');

    if (usuarioResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Credenciales inválidas'
      });
    }

    const usuario = usuarioResult.rows[0];

    // ✅ CORREGIDO: Verificar contraseña usando el campo correcto
    const passwordValido = await bcrypt.compare(contraseña, usuario.contraseña);
    
    console.log('🔑 Contraseña válida:', passwordValido ? 'Sí' : 'No');
    
    if (!passwordValido) {
      return res.status(401).json({
        success: false,
        error: 'Credenciales inválidas'
      });
    }

    // Generar token JWT
    const token = jwt.sign(
      { 
        userId: usuario.id, 
        email: usuario.correo,
        tipo: usuario.tipo_usuario
      },
      process.env.JWT_SECRET || 'secreto-desarrollo',
      { expiresIn: '7d' }
    );

    console.log('✅ Login exitoso para usuario ID:', usuario.id);

    res.json({
      success: true,
      message: '✅ Login exitoso',
      data: {
        usuario: {
          id: usuario.id,
          correo: usuario.correo,
          nombre_completo: usuario.nombre_completo,
          tipo_usuario: usuario.tipo_usuario
        },
        token: token
      }
    });

  } catch (error) {
    console.error('❌ Error en login:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor en el login',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    if (client) {
      client.release();
    }
  }
});


// GET /api/auth/perfil - Obtener perfil del usuario
router.get('/perfil', authMiddleware, async (req, res) => {
  let client;
  try {
    const usuarioId = req.user.userId;

    client = await pool.connect();

    // Obtener datos del usuario
    const usuarioResult = await client.query(
      'SELECT id, correo, nombre_completo, tipo_usuario, fecha_registro FROM usuario WHERE id = $1',
      [usuarioId]
    );

    if (usuarioResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    const usuario = usuarioResult.rows[0];

    // Obtener datos de la vivienda
    const viviendaResult = await client.query(
      `SELECT v.cantidad_personas, v.superficie_1, v.superficie_2, v.region, v.comuna,
              c.nombre as nombre_comuna, r.nombre as nombre_region
       FROM vivienda v
       LEFT JOIN comuna c ON v.comuna = c.id
       LEFT JOIN region r ON v.region = r.nombre  -- ← CORREGIDO: unir por nombre de región
       WHERE v.id_usuario = $1`,
      [usuarioId]
    );

    const vivienda = viviendaResult.rows[0] || {};

    res.json({
      success: true,
      usuario: usuario,
      vivienda: vivienda
    });

  } catch (error) {
    console.error('❌ Error al obtener perfil:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener perfil del usuario'
    });
  } finally {
    if (client) {
      client.release();
    }
  }
});

// POST /api/auth/solicitar-reset-password - Solicitar reset de contraseña
router.post('/solicitar-reset-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'El email es obligatorio'
      });
    }

    // En una implementación real, aquí enviarías un email con un enlace para resetear la contraseña
    // Por ahora, solo simulamos el proceso
    
    console.log('📧 Solicitud de reset de contraseña para:', email);

    // Simular envío de email
    setTimeout(() => {
      console.log(`📨 Email de reset enviado a: ${email}`);
    }, 1000);

    res.json({
      success: true,
      message: 'Si el email existe en nuestro sistema, recibirás un enlace para resetear tu contraseña'
    });

  } catch (error) {
    console.error('❌ Error en solicitud de reset:', error);
    res.status(500).json({
      success: false,
      error: 'Error al procesar la solicitud de reset de contraseña'
    });
  }
});

// POST /api/auth/verificar-token - Verificar si un token es válido
router.post('/verificar-token', authMiddleware, async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Token válido',
      usuario: req.user
    });
  } catch (error) {
    console.error('❌ Error verificando token:', error);
    res.status(401).json({
      success: false,
      error: 'Token inválido'
    });
  }
});

module.exports = router;
