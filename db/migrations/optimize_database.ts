import { sql } from "drizzle-orm";
import { db } from "../connection";

export async function optimizeDatabase() {
  try {
    // Create tables if they don't exist
    await db.execute(sql`
      -- User sessions table
      CREATE TABLE IF NOT EXISTS user_sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        session_token TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      -- Refresh tokens table
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        is_revoked BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      -- Activity log table
      CREATE TABLE IF NOT EXISTS user_activity_log (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        action TEXT NOT NULL,
        details JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      -- Wager races table
      CREATE TABLE IF NOT EXISTS wager_races (
        id SERIAL PRIMARY KEY,
        created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT,
        start_date TIMESTAMP NOT NULL,
        end_date TIMESTAMP NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      -- Wager race participants table
      CREATE TABLE IF NOT EXISTS wager_race_participants (
        id SERIAL PRIMARY KEY,
        race_id INTEGER NOT NULL REFERENCES wager_races(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        total_wager DECIMAL NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE(race_id, user_id)
      );

      -- Affiliate stats table
      CREATE TABLE IF NOT EXISTS affiliate_stats (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        total_wager DECIMAL NOT NULL DEFAULT 0,
        timestamp TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // Add indexes for commonly queried columns
    await db.execute(sql`
      -- User session indexes
      CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
      CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);
      CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(is_active);

      -- Refresh token indexes
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON refresh_tokens(expires_at);
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_revoked ON refresh_tokens(is_revoked);

      -- Activity log indexes
      CREATE INDEX IF NOT EXISTS idx_activity_log_date ON user_activity_log(created_at);
      CREATE INDEX IF NOT EXISTS idx_activity_log_action ON user_activity_log(action);

      -- Wager race indexes
      CREATE INDEX IF NOT EXISTS idx_wager_races_dates ON wager_races(start_date, end_date);
      CREATE INDEX IF NOT EXISTS idx_wager_races_status ON wager_races(status);
      CREATE INDEX IF NOT EXISTS idx_wager_race_participants_wager ON wager_race_participants(total_wager DESC);

      -- Affiliate stats indexes
      CREATE INDEX IF NOT EXISTS idx_affiliate_stats_wager ON affiliate_stats(total_wager DESC);
      CREATE INDEX IF NOT EXISTS idx_affiliate_stats_date ON affiliate_stats(timestamp);
    `);

    // Add foreign key indexes
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
      CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON user_activity_log(user_id);
      CREATE INDEX IF NOT EXISTS idx_wager_races_creator ON wager_races(created_by);
      CREATE INDEX IF NOT EXISTS idx_wager_race_participants_race ON wager_race_participants(race_id);
      CREATE INDEX IF NOT EXISTS idx_wager_race_participants_user ON wager_race_participants(user_id);
      CREATE INDEX IF NOT EXISTS idx_affiliate_stats_user ON affiliate_stats(user_id);
    `);

    // Add composite indexes for common query patterns
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_user_sessions_user_active ON user_sessions(user_id, is_active);
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_revoked ON refresh_tokens(user_id, is_revoked);
      CREATE INDEX IF NOT EXISTS idx_wager_races_status_dates ON wager_races(status, start_date, end_date);
    `);

    console.log('Successfully added database optimization indexes');
  } catch (error) {
    console.error('Error optimizing database:', error);
    throw error;
  }
}

export async function revertDatabaseOptimization() {
  try {
    // Drop all created indexes
    await db.execute(sql`
      -- Drop user session indexes
      DROP INDEX IF EXISTS idx_user_sessions_token;
      DROP INDEX IF EXISTS idx_user_sessions_expires;
      DROP INDEX IF EXISTS idx_user_sessions_active;
      DROP INDEX IF EXISTS idx_user_sessions_user_id;
      DROP INDEX IF EXISTS idx_user_sessions_user_active;

      -- Drop refresh token indexes
      DROP INDEX IF EXISTS idx_refresh_tokens_token;
      DROP INDEX IF EXISTS idx_refresh_tokens_expires;
      DROP INDEX IF EXISTS idx_refresh_tokens_revoked;
      DROP INDEX IF EXISTS idx_refresh_tokens_user_id;
      DROP INDEX IF EXISTS idx_refresh_tokens_user_revoked;

      -- Drop activity log indexes
      DROP INDEX IF EXISTS idx_activity_log_date;
      DROP INDEX IF EXISTS idx_activity_log_action;
      DROP INDEX IF EXISTS idx_activity_log_user_id;

      -- Drop wager race indexes
      DROP INDEX IF EXISTS idx_wager_races_dates;
      DROP INDEX IF EXISTS idx_wager_races_status;
      DROP INDEX IF EXISTS idx_wager_races_creator;
      DROP INDEX IF EXISTS idx_wager_races_status_dates;
      DROP INDEX IF EXISTS idx_wager_race_participants_wager;
      DROP INDEX IF EXISTS idx_wager_race_participants_race;
      DROP INDEX IF EXISTS idx_wager_race_participants_user;

      -- Drop affiliate stats indexes
      DROP INDEX IF EXISTS idx_affiliate_stats_wager;
      DROP INDEX IF EXISTS idx_affiliate_stats_date;
      DROP INDEX IF EXISTS idx_affiliate_stats_user;
    `);

    console.log('Successfully removed database optimization indexes');
  } catch (error) {
    console.error('Error removing database optimization:', error);
    throw error;
  }
}
