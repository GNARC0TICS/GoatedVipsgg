import { pgTable, text, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { relations } from 'drizzle-orm';

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
  telegramId: text('telegram_id'),
  isAdmin: boolean('is_admin').notNull().default(false),
  bio: text('bio'),
  profileColor: text('profile_color').default('#D7FF00'),
  goatedAccountLinked: boolean('goated_account_linked').default(false),
  goatedUsername: text('goated_username'),
  createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
  lastLogin: timestamp('last_login'),
  customization: jsonb('customization').default({}).notNull(),
  profileImage: text('profile_image'),
  preferences: jsonb('preferences').default({
    emailNotifications: true,
    telegramNotifications: true,
    marketingEmails: false,
  }).notNull(),
  lastPasswordChange: timestamp('last_password_change'),
  failedLoginAttempts: integer('failed_login_attempts').default(0),
  accountLocked: boolean('account_locked').default(false),
  lockoutUntil: timestamp('lockout_until'),
  // IP tracking and analytics fields
  lastLoginIp: text('last_login_ip'),
  registrationIp: text('registration_ip'),
  ipHistory: jsonb('ip_history').default([]).notNull(),
  userAgent: text('user_agent'),
  deviceInfo: jsonb('device_info').default({}).notNull(),
  loginHistory: jsonb('login_history').default([]).notNull(),
  // Location tracking fields
  country: text('country'),
  city: text('city'),
  lastActive: timestamp('last_active'),
  // Security and analytics fields
  twoFactorEnabled: boolean('two_factor_enabled').default(false),
  emailVerified: boolean('email_verified').default(false),
  suspiciousActivity: boolean('suspicious_activity').default(false),
  activityLogs: jsonb('activity_logs').default([]).notNull(),
});

export const userRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
}));

// Types for IP history and login history
export type IpHistoryEntry = {
  ip: string;
  timestamp: string;
  userAgent?: string;
  country?: string;
  city?: string;
};

export type LoginHistoryEntry = {
  timestamp: string;
  ip: string;
  success: boolean;
  userAgent?: string;
  location?: {
    country?: string;
    city?: string;
  };
};

export type ActivityLogEntry = {
  type: string;
  timestamp: string;
  details: Record<string, any>;
  ip?: string;
};