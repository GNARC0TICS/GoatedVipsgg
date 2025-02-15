import { pgTable, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { relations, type InferModel } from 'drizzle-orm';

export const sessions = pgTable('session', {
  id: text('id').primaryKey(),
  userId: integer('user_id'),
  expiresAt: timestamp('expires_at').notNull(),
});

export const users = pgTable('users', {
  id: integer('id').primaryKey(),
  username: text('username').notNull().unique(),
  password: text('password').notNull(),
  email: text('email').notNull(),
  telegramId: text('telegram_id').unique(),
  isAdmin: boolean('is_admin').default(false),
  bio: text('bio'),
  profileColor: text('profile_color').default('#D7FF00'),
  goatedAccountLinked: boolean('goated_account_linked').default(false),
  goatedUsername: text('goated_username'),
  createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
  lastLogin: timestamp('last_login'),
  customization: jsonb('customization').default({}),
});