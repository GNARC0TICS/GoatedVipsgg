import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@db/schema";

// Configure Neon for serverless environment
neonConfig.fetchConnectionCache = true;

// Environment variables
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Create a SQL client for serverless environment
const sql = neon(databaseUrl);

// Export the drizzle instance
export const db = drizzle(sql, { schema });

// Connection monitoring and management for serverless environment
let isConnected = false;
let lastConnectionTest = 0;
const CONNECTION_TEST_INTERVAL = 60000; // 1 minute

// Enhanced initialization with better retry logic
export async function initDatabase() {
  let retries = 5;
  let lastError = null;
  
  while (retries > 0) {
    try {
      // Test the connection with a simple query
      const result = await sql`SELECT NOW() as current_time`;
      console.log(`Database connection established successfully at ${result[0].current_time}`);
      
      isConnected = true;
      lastConnectionTest = Date.now();
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

// Health check function that doesn't create a new connection if recently tested
export async function checkDatabaseHealth() {
  // If we've tested the connection recently, don't test again
  if (isConnected && (Date.now() - lastConnectionTest) < CONNECTION_TEST_INTERVAL) {
    return true;
  }
  
  try {
    await sql`SELECT 1`;
    isConnected = true;
    lastConnectionTest = Date.now();
    return true;
  } catch (error) {
    console.error("Database health check failed:", error);
    isConnected = false;
    return false;
  }
}

// No explicit connection closing needed for serverless
export async function closeDatabase() {
  // The serverless driver doesn't maintain persistent connections
  // that need to be closed, but we can reset our state
  isConnected = false;
  console.log('Database connection state reset');
  return true;
}

// Add function to check if specific indexes exist
export async function checkIndexes() {
  try {
    const result = await sql`
      SELECT indexname, tablename 
      FROM pg_indexes 
      WHERE schemaname = 'public' 
      ORDER BY tablename, indexname;
    `;
    return result;
  } catch (error) {
    console.error('Error checking indexes:', error);
    return [];
  }
}
