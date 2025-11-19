const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'tu_clave_secreta_muy_segura';

const authController = {
  async registrar(req, res) {
    try {
      const { 
        email, 
        password, 
        nombre, 
        region, 
        comuna, 
        personas, 
        superficie1, 
        superficie2 
      } = req.body;

      // Validaciones
      if (!email || !password || !nombre || !region || !comuna) {
        return res.status(400).json({
          success: false,
          error: 'Correo, contraseña, nombre, región y comuna son obligatorios'
        });
      }

      if (password.length < 8) {
        return res.status(400).json({
          success: false,
          error: 'La contraseña debe tener al menos 8 caracteres'
        });
      }

      // Verificar si el usuario ya existe
      const usuarioExistente = await pool.query(
        'SELECT id FROM usuario WHERE correo = $1',
        [email]
      );

      if (usuarioExistente.rows.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'El correo ya está registrado'
        });
      }

      // Verificar si la región existe
      const regionExistente = await pool.query(
        'SELECT id FROM region WHERE nombre = $1',
        [region]
      );

      if (regionExistente.rows.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'La región seleccionada no existe'
        });
      }

      // Verificar si la comuna existe y pertenece a la región
      const comunaExistente = await pool.query(
        `SELECT c.id FROM comuna c 
         JOIN region r ON c.id_region = r.id 
         WHERE c.nombre = $1 AND r.nombre = $2`,
        [comuna, region]
      );

      if (comunaExistente.rows.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'La comuna seleccionada no existe o no pertenece a la región'
        });
      }

      // Hash de la contraseña
      const saltRounds = 10;
      const contraseñaHash = await bcrypt.hash(password, saltRounds);

      // Iniciar transacción
      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');

        // 1. Insertar usuario
        const usuarioResult = await client.query(
          `INSERT INTO usuario (correo, nombre_completo, contraseña, tipo_usuario, fecha_registro) 
           VALUES ($1, $2, $3, $4, $5) RETURNING id`,
          [email, nombre, contraseñaHash, 'usuario', new Date()]
        );

        const usuarioId = usuarioResult.rows[0].id;

        // 2. Insertar vivienda
        await client.query(
          `INSERT INTO vivienda (id_usuario, region, comuna, cantidad_personas, superficie_1, superficie_2) 
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            usuarioId, 
            region, 
            comunaExistente.rows[0].id, 
            personas || null, 
            superficie1 || null, 
            superficie2 || null
          ]
        );

        await client.query('COMMIT');

        // Generar token JWT
        const token = jwt.sign(
          { 
            userId: usuarioId,
            email: email,
            tipo: 'usuario'
          },
          JWT_SECRET,
          { expiresIn: '7d' }
        );

        res.status(201).json({
          success: true,
          message: 'Usuario registrado exitosamente',
          data: {
            usuario: {
              id: usuarioId,
              correo: email,
              nombre_completo: nombre,
              tipo_usuario: 'usuario'
            },
            token
          }
        });

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

    } catch (error) {
      console.error('Error en registro:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  },

  // INICIO DE SESIÓN
  async login(req, res) {
    try {
      const { correo, contraseña } = req.body;

      // Validaciones
      if (!correo || !contraseña) {
        return res.status(400).json({
          success: false,
          error: 'Correo y contraseña son obligatorios'
        });
      }

      // Buscar usuario
      const result = await pool.query(
        'SELECT * FROM usuario WHERE correo = $1',
        [correo]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({
          success: false,
          error: 'Credenciales inválidas'
        });
      }

      const usuario = result.rows[0];

      // Verificar contraseña
      const contraseñaValida = await bcrypt.compare(contraseña, usuario.contraseña);
      
      if (!contraseñaValida) {
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
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      // Remover contraseña del response
      const { contraseña: _, ...usuarioSinPassword } = usuario;

      res.json({
        success: true,
        message: 'Inicio de sesión exitoso',
        data: {
          usuario: usuarioSinPassword,
          token
        }
      });

    } catch (error) {
      console.error('Error en login:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  },

  // OBTENER PERFIL DEL USUARIO (protegido)
  async perfil(req, res) {
    try {
      // El middleware de auth agregará el usuario al request
      const usuario = req.usuario;
      
      const result = await pool.query(
        'SELECT id, correo, nombre_completo, tipo_usuario, fecha_registro FROM usuario WHERE id = $1',
        [usuario.userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Usuario no encontrado'
        });
      }

      res.json({
        success: true,
        data: result.rows[0]
      });

    } catch (error) {
      console.error('Error obteniendo perfil:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  },

  // SOLICITAR RESTABLECIMIENTO DE CONTRASEÑA
  async solicitarResetPassword(req, res) {
    try {
      const { correo } = req.body;

      if (!correo) {
        return res.status(400).json({
          success: false,
          error: 'El correo es obligatorio'
        });
      }

      // Verificar si el usuario existe
      const result = await pool.query(
        'SELECT id FROM usuario WHERE correo = $1',
        [correo]
      );

      // Por seguridad, no revelamos si el correo existe o no
      if (result.rows.length > 0) {
        // En una implementación real, aquí enviarías un email con un token
        console.log(`Solicitud de reset password para: ${correo}`);
      }

      res.json({
        success: true,
        message: 'Si el correo existe, recibirás instrucciones para restablecer tu contraseña'
      });

    } catch (error) {
      console.error('Error en solicitud reset password:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }
};

module.exports = authController;