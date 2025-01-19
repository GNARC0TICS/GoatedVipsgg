import { drizzle } from "drizzle-orm/neon-http";
import { neon } from '@neondatabase/serverless';
import * as schema from "@db/schema";
import { log } from "../server/vite";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create SQL connection
const sql = neon(process.env.DATABASE_URL!);

// Initialize drizzle with neon-http
export const db = drizzle(sql, { schema });

// Verify connection on startup
sql`SELECT 1`.then(() => {
  log('Database connection established successfully');
}).catch((error) => {
  log(`Database connection error: ${error.message}`);
  // Don't throw here - let the application continue but log the error
});

export default db;