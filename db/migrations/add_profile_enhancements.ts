import { sql } from "drizzle-orm";
import { db } from "../index";

export async function addProfileEnhancements() {
  console.log("Running profile enhancements migration...");

  // Add new fields to users table
  await db.execute(sql`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS bio TEXT,
    ADD COLUMN IF NOT EXISTS profile_color TEXT;
  `);
  console.log("Added bio and profile_color fields to users table");

  // Create user_sessions table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS user_sessions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      session_token TEXT NOT NULL UNIQUE,
      user_agent TEXT,
      ip_address TEXT,
      last_active TIMESTAMP NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMP NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
  console.log("Created user_sessions table");

  // Create user_activity_log table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS user_activity_log (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      action TEXT NOT NULL,
      details JSONB,
      ip_address TEXT,
      user_agent TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
  console.log("Created user_activity_log table");

  console.log("Profile enhancements migration completed successfully");
}
