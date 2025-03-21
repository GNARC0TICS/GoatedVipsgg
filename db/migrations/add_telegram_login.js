import { sql } from 'drizzle-orm';

export async function up(db) {
  // Add Telegram auth fields to users table
  await db.execute(sql`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS telegram_auth_date TIMESTAMP,
    ADD COLUMN IF NOT EXISTS telegram_hash TEXT;
  `);
  
  console.log('✅ Added Telegram login fields to users table');
}

export async function down(db) {
  // Remove Telegram auth fields from users table
  await db.execute(sql`
    ALTER TABLE users
    DROP COLUMN IF EXISTS telegram_auth_date,
    DROP COLUMN IF EXISTS telegram_hash;
  `);
  
  console.log('✅ Removed Telegram login fields from users table');
}
