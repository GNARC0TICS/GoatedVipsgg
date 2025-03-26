import { sql } from "drizzle-orm";
import { db } from "../connection";
import { log } from "../../server/vite";

/**
 * Migration to fix schema mismatches between different schema definitions
 */
export async function fixSchemaMismatch() {
  log("Running migration: fix_schema_mismatch");

  try {
    // Create API key table if it doesn't exist
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS api_keys (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        key TEXT NOT NULL UNIQUE,
        secret TEXT NOT NULL,
        permissions JSONB DEFAULT '{}',
        ip_whitelist TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP,
        last_used_at TIMESTAMP,
        created_by INTEGER REFERENCES users(id),
        is_active BOOLEAN DEFAULT TRUE,
        rate_limit INTEGER DEFAULT 100,
        metadata JSONB DEFAULT '{}'
      )
    `);
    log("API keys table created or confirmed");

    // Add userId column if missing
    try {
      await db.execute(sql`ALTER TABLE affiliate_stats
        ADD COLUMN IF NOT EXISTS "userId" INTEGER REFERENCES users(id)`);
      log("userId column added to affiliate_stats table");
    } catch (error) {
      log(`Error adding userId column: ${error}`);
    }

    // Add uid column if missing
    try {
      await db.execute(sql`ALTER TABLE affiliate_stats
        ADD COLUMN IF NOT EXISTS "uid" VARCHAR(255)`);
      log("uid column added to affiliate_stats table");
    } catch (error) {
      log(`Error adding uid column: ${error}`);
    }

    // Add name column if missing
    try {
      await db.execute(sql`ALTER TABLE affiliate_stats
        ADD COLUMN IF NOT EXISTS "name" VARCHAR(255)`);
      log("name column added to affiliate_stats table");
    } catch (error) {
      log(`Error adding name column: ${error}`);
    }

    // Add period column if missing
    try {
      await db.execute(sql`ALTER TABLE affiliate_stats
        ADD COLUMN IF NOT EXISTS "period" VARCHAR(50)`);
      log("period column added to affiliate_stats table");
    } catch (error) {
      log(`Error adding period column: ${error}`);
    }

    // Add wagered column if missing
    try {
      await db.execute(sql`ALTER TABLE affiliate_stats
        ADD COLUMN IF NOT EXISTS "wagered" DECIMAL(18, 2)`);
      log("wagered column added to affiliate_stats table");
    } catch (error) {
      log(`Error adding wagered column: ${error}`);
    }

    // Create appropriate indexes
    try {
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_affiliate_stats_user_id ON affiliate_stats("userId");
        CREATE INDEX IF NOT EXISTS idx_affiliate_stats_timestamp ON affiliate_stats(timestamp);
        CREATE INDEX IF NOT EXISTS idx_affiliate_stats_period ON affiliate_stats(period);
        CREATE INDEX IF NOT EXISTS idx_affiliate_stats_uid ON affiliate_stats(uid);
      `);
      log("Affiliate stats indexes created");
    } catch (error) {
      log(`Error creating indexes: ${error}`);
    }

    log("Migration completed: fix_schema_mismatch");
    return true;
  } catch (error) {
    log(`Error in fix_schema_mismatch migration: ${error}`);
    return false;
  }
}