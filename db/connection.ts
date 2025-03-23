import pkg from 'pg';
const { Pool } = pkg;
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@db/schema";
const env = { DATABASE_URL: process.env.DATABASE_URL };

// Create a pool with extended options
const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 60000,
  connectionTimeoutMillis: 5000,
  statement_timeout: 10000,
  query_timeout: 10000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000
});

// Add error handler to the pool
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Export both the drizzle instance and the pool
export const db = drizzle(pool, { schema });
export const pgPool = pool;

export async function initDatabase() {
  let retries = 3;
  while (retries > 0) {
    try {
      const client = await pool.connect();
      console.log("Database connection established successfully");
      
      // Test the connection with a simple query
      await client.query('SELECT NOW()');
      client.release();
      return true;
    } catch (error) {
      retries--;
      if (retries === 0) {
        console.error("Error connecting to database after all retries:", error);
        return false;
      }
      console.log(`Connection failed, retrying... (${retries} attempts remaining)`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  return false;
}