const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;
const EFFECTIVE_DB_NAME = DB_NAME && DB_NAME.trim().length > 0 ? DB_NAME : 'condo_market';

let pool = null;

async function initPool() {
  if (!DB_HOST || !DB_USER) {
    console.warn('DB not fully configured. Set DB_HOST and DB_USER in backend/.env. Running in stub mode.');
    return null;
  }
  try {
    pool = mysql.createPool({
      host: DB_HOST,
      port: DB_PORT ? Number(DB_PORT) : 3306,
      user: DB_USER,
      password: DB_PASSWORD,
      database: EFFECTIVE_DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
    });
    await pool.query("SELECT 1");
    console.log('Connected to MySQL.');
    return pool;
  } catch (err) {
    console.error('Failed to connect to MySQL:', err.message);
    pool = null;
    return null;
  }
}

async function query(sql, params) {
  if (!pool) {
    throw new Error('DB not configured. Set DB_HOST/DB_USER/DB_NAME in .env and restart the server.');
  }
  const [rows] = await pool.query(sql, params);
  return rows;
}

initPool();

module.exports = { initPool, query, getPool: () => pool };
