import { pgTable, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users";

export const telegramUsers = pgTable('telegram_users', {
  id: integer('id').primaryKey(),
  telegramId: text('telegram_id').notNull().unique(),
  username: text('username').references(() => users.username),
  isVerified: boolean('is_verified').default(false),
  createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
  lastActive: timestamp('last_active').default(sql`CURRENT_TIMESTAMP`),
  notificationsEnabled: boolean('notifications_enabled').default(true),
});

export const bonusCodes = pgTable('bonus_codes', {
  id: integer('id').primaryKey(),
  code: text('code').notNull().unique(),
  createdBy: text('created_by').references(() => users.username),
  createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
  expiresAt: timestamp('expires_at'),
  isGroupDrop: boolean('is_group_drop').default(false),
  maxRedemptions: integer('max_redemptions'),
  currentRedemptions: integer('current_redemptions').default(0),
});

export const bonusRedemptions = pgTable('bonus_redemptions', {
  id: integer('id').primaryKey(),
  bonusId: integer('bonus_id').references(() => bonusCodes.id),
  telegramUserId: integer('telegram_user_id').references(() => telegramUsers.id),
  redeemedAt: timestamp('redeemed_at').default(sql`CURRENT_TIMESTAMP`),
});

export const raceStats = pgTable('race_stats', {
  id: integer('id').primaryKey(),
  username: text('username').references(() => users.username),
  monthlyWager: integer('monthly_wager').default(0),
  weeklyWager: integer('weekly_wager').default(0),
  dailyWager: integer('daily_wager').default(0),
  lastUpdated: timestamp('last_updated').default(sql`CURRENT_TIMESTAMP`),
});
