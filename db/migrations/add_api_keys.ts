import { sql } from "drizzle-orm";
import { pgTable, serial, text, timestamp, boolean, integer, json } from "drizzle-orm/pg-core";
import { db } from "../connection";

/**
 * Migration to add API keys table for Telegram bot integration
 * 
 * This migration adds the following tables:
 * - api_keys: Stores API keys for service-to-service authentication
 * - api_key_usage: Tracks API key usage for auditing and rate limiting
 * - used_nonces: Stores used nonces to prevent replay attacks
 * - security_events: Logs security-related events for auditing and monitoring
 */
export async function addApiKeys() {
  console.log("Running migration: add_api_keys");

  // Create api_keys table
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

  // Create api_key_usage table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS api_key_usage (
      id SERIAL PRIMARY KEY,
      key_id INTEGER REFERENCES api_keys(id),
      endpoint TEXT NOT NULL,
      method TEXT NOT NULL,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      ip TEXT,
      user_agent TEXT,
      success BOOLEAN DEFAULT TRUE,
      response_time INTEGER,
      error_code TEXT
    )
  `);

  // Create used_nonces table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS used_nonces (
      nonce TEXT PRIMARY KEY,
      timestamp TIMESTAMP NOT NULL,
      expires_at TIMESTAMP NOT NULL
    )
  `);

  // Create security_events table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS security_events (
      id SERIAL PRIMARY KEY,
      event_type TEXT NOT NULL,
      severity TEXT NOT NULL,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      ip TEXT,
      telegram_id TEXT,
      api_key_id INTEGER,
      details JSONB DEFAULT '{}'
    )
  `);

  console.log("Migration completed: add_api_keys");
}
