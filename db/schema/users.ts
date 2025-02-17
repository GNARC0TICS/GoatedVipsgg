
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
  telegramId: text('telegram_id').unique(),
  isAdmin: boolean('is_admin').notNull().default(false),
  bio: text('bio'),
  profileColor: text('profile_color').default('#D7FF00'),
  bannerImage: text('banner_image'),
  socialLinks: jsonb('social_links').default({
    telegram: null,
    twitter: null,
    discord: null
  }).notNull(),
  displayBadges: jsonb('display_badges').default([]).notNull(),
  favoriteAchievements: jsonb('favorite_achievements').default([]).notNull(),
  customTheme: jsonb('custom_theme').default({
    primary: '#D7FF00',
    secondary: '#1A1B21',
    accent: '#2A2B31'
  }).notNull(),
  goatedAccountLinked: boolean('goated_account_linked').default(false),
  goatedUsername: text('goated_username'),
  createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
  lastActive: timestamp('last_active'),
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
  twoFactorEnabled: boolean('two_factor_enabled').default(false),
  emailVerified: boolean('email_verified').default(false),
  suspiciousActivity: boolean('suspicious_activity').default(false),
  activityLogs: jsonb('activity_logs').default([]).notNull(),
});

export const userRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
}));
