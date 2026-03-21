import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 2_000,
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err);
});

/**
 * Execute a parameterised SQL query.
 * @param {string} text  - SQL string with $1, $2 … placeholders
 * @param {any[]}  params - Parameter values
 * @returns {Promise<import('pg').QueryResult>}
 */
export const query = (text, params) => pool.query(text, params);

/**
 * Verify the database is reachable.
 * Call once at server startup — logs success or a clear error message.
 */
export async function testConnection() {
  let client;
  try {
    client = await pool.connect();             // try to acquire a real connection
    const result = await client.query('SELECT NOW() AS time');
    console.log(`🗄️  Database connected — server time: ${result.rows[0].time}`);
  } catch (err) {
    console.error('❌  Database connection FAILED:', err.message);
    console.error('    → Check DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME in .env');
    process.exit(1); // crash fast so the problem is obvious
  } finally {
    client?.release();
  }
}

export default pool;
