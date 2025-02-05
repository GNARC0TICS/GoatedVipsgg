
import { pgTable, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const telegramUsers = pgTable('telegram_users', {
  id: integer('id').primaryKey(),
  telegramId: text('telegram_id').notNull().unique(),
  goatedUsername: text('goated_username'),
  isVerified: boolean('is_verified').default(false),
  createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
  lastActive: timestamp('last_active').default(sql`CURRENT_TIMESTAMP`),
  notificationsEnabled: boolean('notifications_enabled').default(true),
});

export const verificationRequests = pgTable('verification_requests', {
  id: integer('id').primaryKey(),
  telegramId: text('telegram_id').notNull().unique(),
  goatedUsername: text('goated_username').notNull(),
  requestedAt: timestamp('requested_at').default(sql`CURRENT_TIMESTAMP`),
  status: text('status').default('pending'), // pending, approved, rejected
  adminNotes: text('admin_notes'),
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
  status: text('status').default('active'), // active, completed
  createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
  createdBy: text('created_by').notNull(),
});

export const challengeEntries = pgTable('challenge_entries', {
  id: integer('id').primaryKey(),
  challengeId: integer('challenge_id').notNull(),
  telegramId: text('telegram_id').notNull(),
  betLink: text('bet_link').notNull(),
  status: text('status').default('pending'), // pending, verified, rejected
  bonusCode: text('bonus_code'),
  submittedAt: timestamp('submitted_at').default(sql`CURRENT_TIMESTAMP`),
  verifiedAt: timestamp('verified_at'),
  verifiedBy: text('verified_by'),
});

export const bonusCodes = pgTable('bonus_codes', {
  id: integer('id').primaryKey(),
  code: text('code').notNull().unique(),
  wagerAmount: integer('wager_amount').notNull(),
  wagerPeriodDays: integer('wager_period_days').notNull(),
  rewardAmount: text('reward_amount').notNull(),
  maxClaims: integer('max_claims').notNull(),
  currentClaims: integer('current_claims').default(0),
  createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
  createdBy: text('created_by').notNull(),
  expiresAt: timestamp('expires_at'),
  status: text('status').default('active'), // active, expired, depleted
});

export const bonusCodeClaims = pgTable('bonus_code_claims', {
  id: integer('id').primaryKey(),
  bonusCodeId: integer('bonus_code_id').notNull(),
  telegramId: text('telegram_id').notNull(),
  claimedAt: timestamp('claimed_at').default(sql`CURRENT_TIMESTAMP`),
});
