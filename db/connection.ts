import { drizzle } from "drizzle-orm/neon-http";
import { neon, neonConfig } from "@neondatabase/serverless";
import * as schema from "./schema";
import { log } from "../server/vite";
import dotenv from "dotenv";

dotenv.config();

// Production optimizations for Neon
if (process.env.NODE_ENV === 'production') {
  // Enable connection caching for better performance
  neonConfig.fetchConnectionCache = true;
  
  // Use WebSockets in production for better connection stability
  neonConfig.useSecureWebSocket = true;
  
  // Log production configuration
  log("Neon database configured for production with connection caching and secure WebSockets");
}

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create SQL connection
const sql = neon(process.env.DATABASE_URL!);

// Initialize drizzle with neon-http
export const db = drizzle(sql, { schema });

// Health check function to verify database connection
export async function checkDatabaseConnection() {
  try {
    // Simple query to check if the database is accessible
    const result = await sql`SELECT 1 as connected`;
    return { connected: true, result };
  } catch (error) {
    console.error("Database connection error:", error);
    return { 
      connected: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}

// Graceful shutdown function to close all connections
export async function closeDatabaseConnections() {
  try {
    log("Closing database connections...");
    // Any cleanup needed for Neon connections
    return true;
  } catch (error) {
    console.error("Error closing database connections:", error);
    return false;
  }
}

// Verify connection on startup
sql`SELECT 1`
  .then(() => {
    log("Database connection established successfully");
  })
  .catch((error) => {
    log(`Database connection error: ${error.message}`);
    // Don't throw here - let the application continue but log the error
  });

// Re-export schema types and utils
export * from "./schema";
export * from "./schema/telegram";

// Export the raw SQL executor for complex queries
export { sql };
