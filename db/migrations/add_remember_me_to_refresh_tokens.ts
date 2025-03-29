import { sql } from "drizzle-orm";
import { boolean } from "drizzle-orm/pg-core";
import { db } from "../connection";
import { refreshTokens } from "../schema/auth";

export async function addRememberMeToRefreshTokens() {
  try {
    // Add remember_me column if it doesn't exist
    await db.execute(sql`
      ALTER TABLE refresh_tokens
      ADD COLUMN IF NOT EXISTS remember_me BOOLEAN NOT NULL DEFAULT false;
    `);

    console.log('Successfully added remember_me column to refresh_tokens table');
  } catch (error) {
    console.error('Error adding remember_me column:', error);
    throw error;
  }
}

export async function revertRememberMeFromRefreshTokens() {
  try {
    // Remove remember_me column if it exists
    await db.execute(sql`
      ALTER TABLE refresh_tokens
      DROP COLUMN IF EXISTS remember_me;
    `);

    console.log('Successfully removed remember_me column from refresh_tokens table');
  } catch (error) {
    console.error('Error removing remember_me column:', error);
    throw error;
  }
}
