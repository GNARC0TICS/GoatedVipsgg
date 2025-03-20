import pkg from 'pg';
const { Pool } = pkg;
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@db/schema";
const env = { DATABASE_URL: process.env.DATABASE_URL };

// Create a pool with extended options
const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
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
  try {
    const client = await pool.connect();
    console.log("Database connection established successfully");
    
    // Test the connection with a simple query
    await client.query('SELECT NOW()');
    client.release();
    return true;
  } catch (error) {
    console.error("Error connecting to database:", error);
    return false;
  }
}