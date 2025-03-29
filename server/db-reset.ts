import { db } from '../db/connection';
import { sql } from 'drizzle-orm';
import { users, wagerRaces, notificationPreferences } from '../db/schema';

async function resetDatabase() {
  try {
    console.log('Starting database reset...');

    // Drop existing tables if they exist
    await db.execute(sql`DROP TABLE IF EXISTS notification_preferences CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS wager_race_participants CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS wager_races CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS users CASCADE`);

    // Create tables with proper schema
    await db.execute(sql`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        is_admin BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        last_login TIMESTAMP,
        last_login_ip TEXT,
        is_email_verified BOOLEAN NOT NULL DEFAULT false,
        email_verification_token TEXT,
        email_verification_token_expiry TIMESTAMP,
        email_verified_at TIMESTAMP,
        password_reset_token TEXT,
        password_reset_token_expiry TIMESTAMP,
        bio TEXT,
        profile_color TEXT,
        goated_uid TEXT UNIQUE,
        goated_username TEXT,
        is_goated_verified BOOLEAN NOT NULL DEFAULT false,
        goated_verified_at TIMESTAMP,
        telegram_id TEXT UNIQUE,
        telegram_username TEXT,
        is_telegram_verified BOOLEAN NOT NULL DEFAULT false,
        telegram_verified_at TIMESTAMP
      )
    `);

    console.log('✓ Users table created');

    // Create other necessary tables
    await db.execute(sql`
      CREATE TABLE wager_races (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        status TEXT NOT NULL,
        prize_pool DECIMAL(18,2) NOT NULL,
        start_date TIMESTAMP NOT NULL,
        end_date TIMESTAMP NOT NULL,
        min_wager DECIMAL(18,2) NOT NULL,
        prize_distribution JSONB NOT NULL,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        rules TEXT,
        description TEXT
      )
    `);

    console.log('✓ Wager races table created');

    await db.execute(sql`
      CREATE TABLE notification_preferences (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        wager_race_updates BOOLEAN NOT NULL DEFAULT true,
        vip_status_changes BOOLEAN NOT NULL DEFAULT true,
        promotional_offers BOOLEAN NOT NULL DEFAULT true,
        monthly_statements BOOLEAN NOT NULL DEFAULT true,
        email_notifications BOOLEAN NOT NULL DEFAULT true,
        push_notifications BOOLEAN NOT NULL DEFAULT true,
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    console.log('✓ Notification preferences table created');
    console.log('Database reset completed successfully');

  } catch (error) {
    console.error('Error during database reset:', error);
    throw error;
  }
}

resetDatabase().catch(console.error);