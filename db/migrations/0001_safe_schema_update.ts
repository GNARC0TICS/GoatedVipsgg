import { sql } from "drizzle-orm";

// Migration statements
export async function up(db: any) {
  // Create verification_history table first
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
      unique_request TEXT UNIQUE
    );
  `);

  // Create function to generate unique request
  await db.execute(sql`
    CREATE OR REPLACE FUNCTION generate_unique_request()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.unique_request := NEW.telegram_id || '_' || EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)::text;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // Create trigger for unique_request
  await db.execute(sql`
    DROP TRIGGER IF EXISTS set_unique_request ON verification_requests_new;
    CREATE TRIGGER set_unique_request
    BEFORE INSERT ON verification_requests_new
    FOR EACH ROW
    EXECUTE FUNCTION generate_unique_request();
  `);

  // Migrate telegram users data
  await db.execute(sql`
    INSERT INTO telegram_users_new (
      telegram_id, 
      telegram_username, 
      user_id, 
      is_verified, 
      verified_at
    )
    SELECT 
      telegram_id, 
      telegram_username, 
      user_id, 
      is_verified, 
      verified_at
    FROM telegram_users;
  `);

  // Migrate only approved verification requests
  await db.execute(sql`
    INSERT INTO verification_requests_new (
      telegram_id,
      user_id,
      status,
      telegram_username,
      verified_at,
      goated_username
    )
    SELECT 
      telegram_id,
      user_id,
      'approved' as status,
      telegram_username,
      verified_at,
      goated_username
    FROM verification_requests
    WHERE status = 'approved';
  `);

  // Backup old tables and rename new ones
  await db.execute(sql`
    ALTER TABLE telegram_users RENAME TO telegram_users_backup;
    ALTER TABLE verification_requests RENAME TO verification_requests_backup;

    ALTER TABLE telegram_users_new RENAME TO telegram_users;
    ALTER TABLE verification_requests_new RENAME TO verification_requests;
  `);

  // Create indices for better query performance
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_telegram_users_user_id ON telegram_users(user_id);
    CREATE INDEX IF NOT EXISTS idx_verification_requests_user_id ON verification_requests(user_id);
    CREATE INDEX IF NOT EXISTS idx_verification_requests_status ON verification_requests(status);
  `);
}

export async function down(db: any) {
  // Rollback schema changes
  await db.execute(sql`
    -- Drop indices
    DROP INDEX IF EXISTS idx_telegram_users_user_id;
    DROP INDEX IF EXISTS idx_verification_requests_user_id;
    DROP INDEX IF EXISTS idx_verification_requests_status;

    -- Restore original tables
    DROP TABLE IF EXISTS telegram_users;
    DROP TABLE IF EXISTS verification_requests;

    ALTER TABLE telegram_users_backup RENAME TO telegram_users;
    ALTER TABLE verification_requests_backup RENAME TO verification_requests;

    -- Drop verification history and triggers
    DROP TABLE IF EXISTS verification_history;
    DROP TRIGGER IF EXISTS set_unique_request ON verification_requests;
    DROP FUNCTION IF EXISTS generate_unique_request();
  `);
}