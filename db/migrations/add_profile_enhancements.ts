import { sql } from "drizzle-orm";
import { db } from "../connection";

export async function addProfileEnhancements() {
  try {
    // Create users table if it doesn't exist
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        is_admin BOOLEAN NOT NULL DEFAULT false
      );
    `);

    // Add profile enhancement columns if they don't exist
    await db.execute(sql`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS bio TEXT,
      ADD COLUMN IF NOT EXISTS profile_color TEXT,
      ADD COLUMN IF NOT EXISTS goated_uid TEXT UNIQUE,
      ADD COLUMN IF NOT EXISTS goated_username TEXT,
      ADD COLUMN IF NOT EXISTS is_goated_verified BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS goated_verified_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS telegram_id TEXT UNIQUE,
      ADD COLUMN IF NOT EXISTS telegram_username TEXT,
      ADD COLUMN IF NOT EXISTS is_telegram_verified BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS telegram_verified_at TIMESTAMP;
    `);

    // Add indexes for performance
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_users_goated_uid ON users(goated_uid);
      CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
      CREATE INDEX IF NOT EXISTS idx_users_goated_username ON users(goated_username);
      CREATE INDEX IF NOT EXISTS idx_users_telegram_username ON users(telegram_username);
    `);

    console.log('Successfully added profile enhancement columns and indexes');
  } catch (error) {
    console.error('Error adding profile enhancements:', error);
    throw error;
  }
}

export async function revertProfileEnhancements() {
  try {
    // Drop indexes first
    await db.execute(sql`
      DROP INDEX IF EXISTS idx_users_goated_uid;
      DROP INDEX IF EXISTS idx_users_telegram_id;
      DROP INDEX IF EXISTS idx_users_goated_username;
      DROP INDEX IF EXISTS idx_users_telegram_username;
    `);

    // Drop columns
    await db.execute(sql`
      ALTER TABLE users
      DROP COLUMN IF EXISTS bio,
      DROP COLUMN IF EXISTS profile_color,
      DROP COLUMN IF EXISTS goated_uid,
      DROP COLUMN IF EXISTS goated_username,
      DROP COLUMN IF EXISTS is_goated_verified,
      DROP COLUMN IF EXISTS goated_verified_at,
      DROP COLUMN IF EXISTS telegram_id,
      DROP COLUMN IF EXISTS telegram_username,
      DROP COLUMN IF EXISTS is_telegram_verified,
      DROP COLUMN IF EXISTS telegram_verified_at;
    `);

    console.log('Successfully removed profile enhancement columns and indexes');
  } catch (error) {
    console.error('Error removing profile enhancements:', error);
    throw error;
  }
}
