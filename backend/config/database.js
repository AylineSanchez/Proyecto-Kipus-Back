//backend/config/database.js

const {Pool} = require("pg");

const pool = new Pool ((
  connectionString: process.env.DATABASE_URL,
  ssl:{
    rejectUnauthorized: false
  }require('pg');
));

// Verificar conexión al iniciar
pool.query('SELECT NOW()')
  .then(() => console.log('✅ PostgreSQL conectado exitosamente'))
  .catch(err => console.error('❌ Error conectando a PostgreSQL:', err.message));

module.exports = pool;
