import { pgTable, text, timestamp, boolean, serial, integer } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { relations } from "drizzle-orm";
import { users } from "../schema";

export const telegramUsers = pgTable('telegram_users', {
  id: serial('id').primaryKey(),
  telegramId: text('telegram_id').unique().notNull(),
  telegramUsername: text('telegram_username'),
  userId: integer('user_id').notNull().references(() => users.id),
  isVerified: boolean('is_verified').default(false),
  createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
  notificationsEnabled: boolean('notifications_enabled').default(true),
  verifiedAt: timestamp('verified_at'),
  verifiedBy: text('verified_by'),
  updatedAt: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP`)
});

export const verificationRequests = pgTable('verification_requests', {
  id: serial('id').primaryKey(),
  telegramId: text('telegram_id').notNull(),
  userId: integer('user_id').notNull().references(() => users.id),
  requestedAt: timestamp('requested_at').default(sql`CURRENT_TIMESTAMP`),
  status: text('status').default('pending'),
  adminNotes: text('admin_notes'),
  telegramUsername: text('telegram_username'),
  verifiedAt: timestamp('verified_at'),
  verifiedBy: text('verified_by'),
  updatedAt: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP`),
  goatedUsername: text('goated_username'),
  // Add a unique constraint to prevent duplicate requests
  // This ensures only one active verification request per telegram user
  uniqueRequest: text('unique_request').unique()
    .default(sql`CONCAT(telegram_id, '_', EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)::text)`)
});

export const verificationHistory = pgTable('verification_history', {
  id: serial('id').primaryKey(),
  telegramId: text('telegram_id').notNull(),
  userId: integer('user_id').notNull().references(() => users.id),
  status: text('status').notNull(),
  goatedUsername: text('goated_username'),
  verifiedBy: text('verified_by'),
  verifiedAt: timestamp('verified_at').default(sql`CURRENT_TIMESTAMP`),
  adminNotes: text('admin_notes'),
  createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`)
});

export const challenges = pgTable('challenges', {
  id: serial('id').primaryKey(),
  game: text('game').notNull(),
  multiplier: text('multiplier'),
  minBet: text('min_bet').notNull(),
  prizeAmount: text('prize_amount').notNull(),
  maxWinners: integer('max_winners').notNull(),
  timeframe: text('timeframe'),
  description: text('description').default(''),
  status: text('status').default('active'),
  createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
  createdBy: text('created_by').notNull(),
  updatedAt: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP`)
});

export const challengeEntries = pgTable('challenge_entries', {
  id: serial('id').primaryKey(),
  challengeId: integer('challenge_id')
    .notNull()
    .references(() => challenges.id),
  telegramId: text('telegram_id').notNull(),
  betLink: text('bet_link').notNull(),
  status: text('status').default('pending'),
  bonusCode: text('bonus_code'),
  submittedAt: timestamp('submitted_at').default(sql`CURRENT_TIMESTAMP`),
  verifiedAt: timestamp('verified_at'),
  verifiedBy: text('verified_by'),
  updatedAt: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP`)
});

// Add relations
export const telegramUserRelations = relations(telegramUsers, ({ one }) => ({
  user: one(users, {
    fields: [telegramUsers.userId],
    references: [users.id],
  }),
}));

export const verificationRequestRelations = relations(verificationRequests, ({ one }) => ({
  user: one(users, {
    fields: [verificationRequests.userId],
    references: [users.id],
  }),
}));

export const verificationHistoryRelations = relations(verificationHistory, ({ one }) => ({
  user: one(users, {
    fields: [verificationHistory.userId],
    references: [users.id],
  }),
}));

export const challengeEntryRelations = relations(challengeEntries, ({ one }) => ({
  challenge: one(challenges, {
    fields: [challengeEntries.challengeId],
    references: [challenges.id],
  }),
}));