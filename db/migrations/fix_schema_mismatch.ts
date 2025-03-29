import { sql } from "drizzle-orm";
import { db } from "../connection";

export async function fixSchemaMismatch() {
  try {
    // Add missing columns first
    await db.execute(sql`
      -- Add missing columns to user_sessions
      ALTER TABLE user_sessions
      ADD COLUMN IF NOT EXISTS last_active TIMESTAMP;
      
      -- Add missing columns to wager_race_participants
      ALTER TABLE wager_race_participants
      ADD COLUMN IF NOT EXISTS joined_at TIMESTAMP;
    `);

    // Fix column types and constraints
    await db.execute(sql`
      -- Fix user session timestamps
      ALTER TABLE user_sessions
      ALTER COLUMN created_at SET DEFAULT NOW(),
      ALTER COLUMN last_active SET DEFAULT NOW(),
      ALTER COLUMN expires_at SET NOT NULL;

      -- Fix refresh token timestamps
      ALTER TABLE refresh_tokens
      ALTER COLUMN created_at SET DEFAULT NOW(),
      ALTER COLUMN expires_at SET NOT NULL,
      ALTER COLUMN is_revoked SET DEFAULT false;

      -- Fix activity log timestamps
      ALTER TABLE user_activity_log
      ALTER COLUMN created_at SET DEFAULT NOW();

      -- Fix wager race timestamps and constraints
      ALTER TABLE wager_races
      ALTER COLUMN created_at SET DEFAULT NOW(),
      ALTER COLUMN updated_at SET DEFAULT NOW(),
      ALTER COLUMN start_date SET NOT NULL,
      ALTER COLUMN end_date SET NOT NULL;

      -- Fix wager race participant timestamps
      ALTER TABLE wager_race_participants
      ALTER COLUMN joined_at SET DEFAULT NOW(),
      ALTER COLUMN updated_at SET DEFAULT NOW();

      -- Fix affiliate stats timestamps
      ALTER TABLE affiliate_stats
      ALTER COLUMN timestamp SET DEFAULT NOW();
    `);

    // Fix missing foreign key constraints
    await db.execute(sql`
      -- Add missing foreign key constraints if they don't exist
      DO $$ 
      BEGIN
        -- User sessions foreign key
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'user_sessions_user_id_fkey'
        ) THEN
          ALTER TABLE user_sessions
          ADD CONSTRAINT user_sessions_user_id_fkey
          FOREIGN KEY (user_id) REFERENCES users(id);
        END IF;

        -- Refresh tokens foreign key
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'refresh_tokens_user_id_fkey'
        ) THEN
          ALTER TABLE refresh_tokens
          ADD CONSTRAINT refresh_tokens_user_id_fkey
          FOREIGN KEY (user_id) REFERENCES users(id);
        END IF;

        -- Activity log foreign key
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'user_activity_log_user_id_fkey'
        ) THEN
          ALTER TABLE user_activity_log
          ADD CONSTRAINT user_activity_log_user_id_fkey
          FOREIGN KEY (user_id) REFERENCES users(id);
        END IF;

        -- Wager race foreign key
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'wager_races_created_by_fkey'
        ) THEN
          ALTER TABLE wager_races
          ADD CONSTRAINT wager_races_created_by_fkey
          FOREIGN KEY (created_by) REFERENCES users(id);
        END IF;

        -- Wager race participant foreign keys
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'wager_race_participants_race_id_fkey'
        ) THEN
          ALTER TABLE wager_race_participants
          ADD CONSTRAINT wager_race_participants_race_id_fkey
          FOREIGN KEY (race_id) REFERENCES wager_races(id);
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'wager_race_participants_user_id_fkey'
        ) THEN
          ALTER TABLE wager_race_participants
          ADD CONSTRAINT wager_race_participants_user_id_fkey
          FOREIGN KEY (user_id) REFERENCES users(id);
        END IF;

        -- Affiliate stats foreign key
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'affiliate_stats_user_id_fkey'
        ) THEN
          ALTER TABLE affiliate_stats
          ADD CONSTRAINT affiliate_stats_user_id_fkey
          FOREIGN KEY (user_id) REFERENCES users(id);
        END IF;
      END $$;
    `);

    console.log('Successfully fixed schema mismatches');
  } catch (error) {
    console.error('Error fixing schema mismatches:', error);
    throw error;
  }
}

export async function revertSchemaMismatchFixes() {
  try {
    // Remove foreign key constraints
    await db.execute(sql`
      ALTER TABLE user_sessions
      DROP CONSTRAINT IF EXISTS user_sessions_user_id_fkey;

      ALTER TABLE refresh_tokens
      DROP CONSTRAINT IF EXISTS refresh_tokens_user_id_fkey;

      ALTER TABLE user_activity_log
      DROP CONSTRAINT IF EXISTS user_activity_log_user_id_fkey;

      ALTER TABLE wager_races
      DROP CONSTRAINT IF EXISTS wager_races_created_by_fkey;

      ALTER TABLE wager_race_participants
      DROP CONSTRAINT IF EXISTS wager_race_participants_race_id_fkey,
      DROP CONSTRAINT IF EXISTS wager_race_participants_user_id_fkey;

      ALTER TABLE affiliate_stats
      DROP CONSTRAINT IF EXISTS affiliate_stats_user_id_fkey;
    `);

    // Reset column defaults and constraints
    await db.execute(sql`
      -- Reset user session columns
      ALTER TABLE user_sessions
      ALTER COLUMN created_at DROP DEFAULT,
      ALTER COLUMN last_active DROP DEFAULT,
      ALTER COLUMN expires_at DROP NOT NULL;

      -- Reset refresh token columns
      ALTER TABLE refresh_tokens
      ALTER COLUMN created_at DROP DEFAULT,
      ALTER COLUMN expires_at DROP NOT NULL,
      ALTER COLUMN is_revoked DROP DEFAULT;

      -- Reset activity log columns
      ALTER TABLE user_activity_log
      ALTER COLUMN created_at DROP DEFAULT;

      -- Reset wager race columns
      ALTER TABLE wager_races
      ALTER COLUMN created_at DROP DEFAULT,
      ALTER COLUMN updated_at DROP DEFAULT,
      ALTER COLUMN start_date DROP NOT NULL,
      ALTER COLUMN end_date DROP NOT NULL;

      -- Reset wager race participant columns
      ALTER TABLE wager_race_participants
      ALTER COLUMN joined_at DROP DEFAULT,
      ALTER COLUMN updated_at DROP DEFAULT;

      -- Reset affiliate stats columns
      ALTER TABLE affiliate_stats
      ALTER COLUMN timestamp DROP DEFAULT;
    `);

    console.log('Successfully reverted schema mismatch fixes');
  } catch (error) {
    console.error('Error reverting schema mismatch fixes:', error);
    throw error;
  }
}
