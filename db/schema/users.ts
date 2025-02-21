
import { pgTable, text, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const users = pgTable('users', {
  id: integer('id').primaryKey(),
  username: text('username').notNull().unique(),
  password: text('password').notNull(),
  email: text('email').unique().notNull(),
  isAdmin: boolean('is_admin').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  lastLogin: timestamp('last_login').default(sql`CURRENT_TIMESTAMP`),
  lastLoginIp: text('last_login_ip'),
  emailVerificationToken: text('email_verification_token'),
  emailVerified: boolean('email_verified').default(false),
  telegramId: text('telegram_id'),
  telegramVerifiedAt: timestamp('telegram_verified_at'),
  registrationIp: text('registration_ip'),
  ipHistory: jsonb('ip_history'),
  loginHistory: jsonb('login_history'),
  country: text('country'),
  city: text('city'),
  lastActive: timestamp('last_active'),
  telegramVerified: boolean('telegram_verified').default(false),
  goatedUsername: text('goated_username'),
  goatedVerified: boolean('goated_verified').default(false),
});
