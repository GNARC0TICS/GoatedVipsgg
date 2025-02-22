import { sql } from "drizzle-orm";

export async function up(db: any) {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS verification_history (
      id SERIAL PRIMARY KEY,
      telegram_id TEXT NOT NULL,
      user_id INTEGER NOT NULL REFERENCES users(id),
      status TEXT NOT NULL,
      goated_username TEXT,
      verified_by TEXT,
      verified_at TIMESTAMP,
      admin_notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX idx_verification_history_user_id ON verification_history(user_id);
    CREATE INDEX idx_verification_history_telegram_id ON verification_history(telegram_id);
  `);
}

export async function down(db: any) {
  await db.execute(sql`
    DROP INDEX IF EXISTS idx_verification_history_telegram_id;
    DROP INDEX IF EXISTS idx_verification_history_user_id;
    DROP TABLE IF EXISTS verification_history;
  `);
}
