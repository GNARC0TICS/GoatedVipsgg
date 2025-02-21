import { sql } from "drizzle-orm";
import { serial, text, boolean, timestamp, pgTable, integer, jsonb } from "drizzle-orm/pg-core";

// Migration statements
export async function up(db: any) {
  // First create the verification_history table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS verification_history (
      id SERIAL PRIMARY KEY,
      telegram_id TEXT NOT NULL,
      user_id INTEGER NOT NULL REFERENCES users(id),
      status TEXT NOT NULL,
      goated_username TEXT,
      verified_by TEXT,
      verified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      admin_notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Add temporary nullable columns to bonus_codes
  await db.execute(sql`
    ALTER TABLE bonus_codes 
    ADD COLUMN IF NOT EXISTS temp_description TEXT,
    ADD COLUMN IF NOT EXISTS temp_value TEXT;
  `);

  // Copy data to temporary columns
  await db.execute(sql`
    UPDATE bonus_codes 
    SET temp_description = description,
        temp_value = value;
  `);

  // Add NOT NULL constraints with defaults
  await db.execute(sql`
    ALTER TABLE bonus_codes 
    ALTER COLUMN description SET DEFAULT '',
    ALTER COLUMN value SET DEFAULT '0';
  `);

  // Copy data from temporary columns
  await db.execute(sql`
    UPDATE bonus_codes 
    SET description = COALESCE(temp_description, ''),
        value = COALESCE(temp_value, '0');
  `);

  // Drop temporary columns
  await db.execute(sql`
    ALTER TABLE bonus_codes 
    DROP COLUMN IF EXISTS temp_description,
    DROP COLUMN IF EXISTS temp_value;
  `);

  // Create new tables with updated schema
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS telegram_users_new (
      id SERIAL PRIMARY KEY,
      telegram_id TEXT NOT NULL UNIQUE,
      telegram_username TEXT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      is_verified BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      notifications_enabled BOOLEAN DEFAULT true,
      verified_at TIMESTAMP,
      verified_by TEXT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS verification_requests_new (
      id SERIAL PRIMARY KEY,
      telegram_id TEXT NOT NULL,
      user_id INTEGER NOT NULL REFERENCES users(id),
      requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'pending',
      admin_notes TEXT,
      telegram_username TEXT,
      verified_at TIMESTAMP,
      verified_by TEXT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      goated_username TEXT,
      unique_request TEXT UNIQUE DEFAULT CONCAT(telegram_id, '_', EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)::text)
    );
  `);

  // Migrate telegram users data
  await db.execute(sql`
    INSERT INTO telegram_users_new (telegram_id, telegram_username, user_id, is_verified, verified_at)
    SELECT telegram_id, telegram_username, user_id, is_verified, verified_at
    FROM telegram_users ON CONFLICT DO NOTHING;
  `);

  // Migrate verification requests data
  await db.execute(sql`
    INSERT INTO verification_requests_new (telegram_id, user_id, goated_username, status, requested_at, verified_at)
    SELECT telegram_id, user_id, goated_username, status, created_at, verified_at
    FROM verification_requests ON CONFLICT DO NOTHING;
  `);

  // Backup old tables
  await db.execute(sql`
    ALTER TABLE IF EXISTS telegram_users RENAME TO telegram_users_backup_${Date.now()};
    ALTER TABLE IF EXISTS verification_requests RENAME TO verification_requests_backup_${Date.now()};
  `);

  // Rename new tables
  await db.execute(sql`
    ALTER TABLE telegram_users_new RENAME TO telegram_users;
    ALTER TABLE verification_requests_new RENAME TO verification_requests;
  `);

  // Create indices for better query performance
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_telegram_users_user_id ON telegram_users(user_id);
    CREATE INDEX IF NOT EXISTS idx_verification_requests_user_id ON verification_requests(user_id);
    CREATE INDEX IF NOT EXISTS idx_verification_history_user_id ON verification_history(user_id);
  `);
}

export async function down(db: any) {
  // Rollback schema changes if needed
  await db.execute(sql`
    DROP INDEX IF EXISTS idx_telegram_users_user_id;
    DROP INDEX IF EXISTS idx_verification_requests_user_id;
    DROP INDEX IF EXISTS idx_verification_history_user_id;

    ALTER TABLE telegram_users RENAME TO telegram_users_temp;
    ALTER TABLE verification_requests RENAME TO verification_requests_temp;

    ALTER TABLE telegram_users_backup_${Date.now()} RENAME TO telegram_users;
    ALTER TABLE verification_requests_backup_${Date.now()} RENAME TO verification_requests;

    DROP TABLE telegram_users_temp;
    DROP TABLE verification_requests_temp;
    DROP TABLE IF EXISTS verification_history;
  `);
}