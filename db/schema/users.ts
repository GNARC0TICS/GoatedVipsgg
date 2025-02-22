import { pgTable, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { relations } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  expiresAt: timestamp('expires_at').notNull(),
  data: text('data'),
});

export const users = pgTable('users', {
  id: integer('id').primaryKey(),
  username: text('username').notNull().unique(),
  password: text('password').notNull(),
  email: text('email').notNull(),
  telegramId: text('telegram_id').unique(),
  isAdmin: boolean('is_admin').notNull().default(false),
  createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
  lastActive: timestamp('last_active'),
  lastLogin: timestamp('last_login'),
  failedLoginAttempts: integer('failed_login_attempts').default(0),
  accountLocked: boolean('account_locked').default(false),
  lockoutUntil: timestamp('lockout_until'),
  lastLoginIp: text('last_login_ip'),
  registrationIp: text('registration_ip'),
  country: text('country'),
  city: text('city'),
  ipHistory: text('ip_history').array(),
  loginHistory: text('login_history').array(),
  twoFactorEnabled: boolean('two_factor_enabled').default(false),
  suspiciousActivity: boolean('suspicious_activity').default(false),
  activityLogs: text('activity_logs').array(),
});

export const userRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
}));

// Export schemas for Zod validation
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);

// Export types
export type InsertUser = typeof users.$inferInsert;
export type SelectUser = typeof users.$inferSelect;

// Export additional types for user history
export interface IpHistoryEntry {
  ip: string;
  timestamp: string;
  userAgent?: string;
}

export interface LoginHistoryEntry {
  timestamp: string;
  success: boolean;
  ip?: string;
  userAgent?: string;
}

export interface ActivityLogEntry {
  type: string;
  description: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}