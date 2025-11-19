const { Pool } = require('pg');
require('dotenv').config();

console.log('Intentando conectar a:', {
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT
});

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Verificar conexión al iniciar
pool.query('SELECT NOW()')
  .then(() => console.log('✅ PostgreSQL conectado exitosamente'))
  .catch(err => console.error('❌ Error conectando a PostgreSQL:', err.message));

module.exports = pool;