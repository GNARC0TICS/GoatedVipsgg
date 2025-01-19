import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool } from "@neondatabase/serverless";
import * as schema from "@db/schema";
import { log } from "../server/vite";
import { sql } from 'drizzle-orm';
import ws from 'ws';

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Initialize the database with Drizzle and pool
export const db = drizzle(new Pool({ 
  connectionString: process.env.DATABASE_URL,
  webSocketConstructor: ws // Add WebSocket support for Neon
}), { schema });

// Verify connection on startup
db.execute(sql`SELECT 1`).then(() => {
  log('Database connection established successfully');
}).catch((error) => {
  log(`Database connection error: ${error.message}`);
  // Don't throw here - let the application continue but log the error
});

// Export the database instance
export default db;