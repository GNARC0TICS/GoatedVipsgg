import { pgTable, text, timestamp, integer, boolean, serial } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const telegramUsers = pgTable('telegram_users', {
  id: serial('id').primaryKey(),
  telegramId: text('telegram_id').notNull().unique(),
  telegramUsername: text('telegram_username'),
  goatedUsername: text('goated_username'),
  isVerified: boolean('is_verified').default(false),
  createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
  lastActive: timestamp('last_active').default(sql`CURRENT_TIMESTAMP`),
  notificationsEnabled: boolean('notifications_enabled').default(true),
  verifiedAt: timestamp('verified_at')
});

export const verificationRequests = pgTable('verification_requests', {
  id: serial('id').primaryKey().notNull(),
  telegramId: text('telegram_id').notNull(),
  telegramUsername: text('telegram_username'),
  goatedUsername: text('goated_username').notNull(),
  requestedAt: timestamp('requested_at').default(sql`CURRENT_TIMESTAMP`),
  status: text('status').default('pending'), // pending, approved, rejected
  adminNotes: text('admin_notes'),
  verifiedAt: timestamp('verified_at'),
  verifiedBy: text('verified_by'),
});

export const challenges = pgTable('challenges', {
  id: serial('id').primaryKey(),
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
  id: serial('id').primaryKey(),
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
  id: serial('id').primaryKey(),
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
  id: serial('id').primaryKey(),
  bonusCodeId: integer('bonus_code_id').notNull(),
  telegramId: text('telegram_id').notNull(),
  claimedAt: timestamp('claimed_at').default(sql`CURRENT_TIMESTAMP`),
});