const {Pool} = require("pg");

const pool = new Pool ((
  conectionString: process.env.postgresql://kipus_db_qmrb_user:NddFCHTnulSyhFrOzWBVqU98E1L2EFy9@dpg-d4epi43e5dus73fkm6ig-a.oregon-postgres.render.com/kipus_db_qmrb,
  ssl:{
    rejectUnauthorized: false
  }require('pg');
));

console.log('Intentando conectar a:', {
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT
});

// Verificar conexión al iniciar
pool.query('SELECT NOW()')
  .then(() => console.log('✅ PostgreSQL conectado exitosamente'))
  .catch(err => console.error('❌ Error conectando a PostgreSQL:', err.message));

module.exports = pool;
