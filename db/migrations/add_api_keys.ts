import { sql } from "drizzle-orm";
import { db } from "../connection";

export async function addApiKeys() {
  try {
    // Create api_keys table if it doesn't exist
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS api_keys (
        id SERIAL PRIMARY KEY,
        key TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        user_id INTEGER REFERENCES users(id),
        permissions JSONB NOT NULL DEFAULT '[]',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMP,
        last_used_at TIMESTAMP,
        is_active BOOLEAN NOT NULL DEFAULT true
      );
    `);

    // Add indexes
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys(key);
      CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
    `);

    console.log('Successfully created api_keys table and indexes');
  } catch (error) {
    console.error('Error creating api_keys table:', error);
    throw error;
  }
}

export async function revertApiKeys() {
  try {
    // Drop indexes first
    await db.execute(sql`
      DROP INDEX IF EXISTS idx_api_keys_key;
      DROP INDEX IF EXISTS idx_api_keys_user_id;
    `);

    // Drop table
    await db.execute(sql`
      DROP TABLE IF EXISTS api_keys;
    `);

    console.log('Successfully removed api_keys table and indexes');
  } catch (error) {
    console.error('Error removing api_keys table:', error);
    throw error;
  }
}
