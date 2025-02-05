import { pgTable, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const telegramUsers = pgTable('telegram_users', {
  id: text('id').primaryKey(),
  telegramId: text('telegram_id').notNull().unique(),
  goatedUsername: text('goated_username'),
  isVerified: boolean('is_verified').default(false),
  createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
  lastActive: timestamp('last_active').default(sql`CURRENT_TIMESTAMP`),
  notificationsEnabled: boolean('notifications_enabled').default(true),
});

export const verificationRequests = pgTable('verification_requests', {
  id: text('id').primaryKey(),
  telegramId: text('telegram_id').notNull().unique(),
  goatedUsername: text('goated_username').notNull(),
  requestedAt: timestamp('requested_at').default(sql`CURRENT_TIMESTAMP`),
  status: text('status').default('pending'),
  adminNotes: text('admin_notes')
});

export const challenges = pgTable('challenges', {
  id: integer('id').primaryKey(),
  game: text('game').notNull(),
  multiplier: text('multiplier'),
  minBet: text('min_bet').notNull(),
  prizeAmount: text('prize_amount').notNull(),
  maxWinners: integer('max_winners').notNull(),
  timeframe: text('timeframe'),
  description: text('description'),
  status: text('status').default('active'),
  createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
  createdBy: text('created_by').notNull(),
});

export const challengeEntries = pgTable('challenge_entries', {
  id: integer('id').primaryKey(),
  challengeId: integer('challenge_id').notNull(),
  telegramId: text('telegram_id').notNull(),
  betLink: text('bet_link').notNull(),
  status: text('status').default('pending'),
  bonusCode: text('bonus_code'),
  submittedAt: timestamp('submitted_at').default(sql`CURRENT_TIMESTAMP`),
  verifiedAt: timestamp('verified_at'),
  verifiedBy: text('verified_by'),
});