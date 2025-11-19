const pool = require('../config/database');

const ubicacionController = {
  // Obtener todas las regiones
  async obtenerRegiones(req, res) {
    try {
      const result = await pool.query(
        'SELECT id, nombre FROM region ORDER BY nombre'
      );

      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      console.error('Error obteniendo regiones:', error);
      res.status(500).json({
        success: false,
        error: 'Error al obtener regiones'
      });
    }
  },

  // Obtener comunas por región
  async obtenerComunasPorRegion(req, res) {
    try {
      const { regionId } = req.params;

      const result = await pool.query(
        `SELECT c.id, c.nombre 
         FROM comuna c 
         JOIN region r ON c.id_region = r.id 
         WHERE r.id = $1 
         ORDER BY c.nombre`,
        [regionId]
      );

      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      console.error('Error obteniendo comunas:', error);
      res.status(500).json({
        success: false,
        error: 'Error al obtener comunas'
      });
    }
  },

  // Obtener todas las comunas (para búsqueda)
  async obtenerTodasLasComunas(req, res) {
    try {
      const result = await pool.query(
        'SELECT id, nombre, id_region FROM comuna ORDER BY nombre'
      );

      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      console.error('Error obteniendo comunas:', error);
      res.status(500).json({
        success: false,
        error: 'Error al obtener comunas'
      });
    }
  }
};

module.exports = ubicacionController;