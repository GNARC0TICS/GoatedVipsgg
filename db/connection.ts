import pkg from 'pg';
const { Pool } = pkg;
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@db/schema";
const env = { DATABASE_URL: process.env.DATABASE_URL };

// Create a pool with optimized options
const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 20, // Increased from 10 for better concurrency
  min: 2,  // Ensure at least 2 connections are always ready
  idleTimeoutMillis: 60000,
  connectionTimeoutMillis: 5000,
  statement_timeout: 10000,
  query_timeout: 10000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000
});

// Add enhanced error handler to the pool
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
  // Don't exit the process on a pool error
  // Instead, just log it and let the pool handle it
});

// Add connection time logging
pool.on('connect', () => {
  console.log('Database connection established');
});

// Export both the drizzle instance and the pool
export const db = drizzle(pool, { schema });
export const pgPool = pool;

// Enhanced initialization with better retry logic
export async function initDatabase() {
  let retries = 5; // Increased from 3
  let lastError = null;

  while (retries > 0) {
    try {
      const client = await pool.connect();

      // Test the connection with a simple query
      const result = await client.query('SELECT NOW() as current_time');
      console.log(`Database connection established successfully at ${result.rows[0].current_time}`);

      // Monitor connection counts
      const poolStatus = await getPoolStatus();
      console.log(`Pool status: ${poolStatus.total} connections (${poolStatus.idle} idle, ${poolStatus.waiting} waiting)`);

      client.release();
      return true;
    } catch (error) {
      lastError = error;
      retries--;

      if (retries === 0) {
        console.error("Error connecting to database after all retries:", error);
        return false;
      }

      const backoffTime = Math.pow(2, 5 - retries) * 1000; // Exponential backoff
      console.log(`Connection failed, retrying in ${backoffTime/1000}s... (${retries} attempts remaining)`);
      await new Promise(resolve => setTimeout(resolve, backoffTime));
    }
  }

  console.error("Failed to initialize database:", lastError);
  return false;
}

// Add a function to gracefully shut down the pool
export async function closeDatabase() {
  try {
    console.log('Closing database pool...');
    await pool.end();
    console.log('Database pool closed successfully');
    return true;
  } catch (error) {
    console.error('Error closing database pool:', error);
    return false;
  }
}

// Add a function to get pool status
export async function getPoolStatus() {
  return {
    total: pool.totalCount,
    idle: pool.idleCount,
    waiting: pool.waitingCount
  };
}

// Add function to check if specific indexes exist
export async function checkIndexes() {
  try {
    const client = await pool.connect();
    const result = await client.query(`
      SELECT indexname, tablename 
      FROM pg_indexes 
      WHERE schemaname = 'public' 
      ORDER BY tablename, indexname;
    `);
    client.release();
    return result.rows;
  } catch (error) {
    console.error('Error checking indexes:', error);
    return [];
  }
}