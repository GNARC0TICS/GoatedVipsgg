import { pgTable, text, timestamp, boolean, serial, integer } from "drizzle-orm/pg-core";
import { sql, relations } from "drizzle-orm";
import { users } from "../schema";

export const telegramUsers = pgTable('telegram_users', {
  telegramId: text('telegram_id').primaryKey(),
  telegramUsername: text('telegram_username'),
  goatedUsername: text('goated_username'),
  goatedUid: text('goated_uid'),
  isVerified: boolean('is_verified').default(false),
  createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
  lastActive: timestamp('last_active').default(sql`CURRENT_TIMESTAMP`),
  notificationsEnabled: boolean('notifications_enabled').default(true),
  verifiedAt: timestamp('verified_at'),
  verifiedBy: text('verified_by'),
  updatedAt: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP`),
  // Link to platform user
  platformUserId: integer('platform_user_id').references(() => users.id),
});

export const verificationRequests = pgTable('verification_requests', {
  telegramId: text('telegram_id').primaryKey(),
  goatedUsername: text('goated_username').notNull(),
  requestedAt: timestamp('requested_at').default(sql`CURRENT_TIMESTAMP`),
  status: text('status').default('pending'),
  adminNotes: text('admin_notes'),
  telegramUsername: text('telegram_username'),
  verifiedAt: timestamp('verified_at'),
  verifiedBy: text('verified_by'),
  updatedAt: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP`)
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
  status: text('status').default('active'),
  createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
  createdBy: text('created_by').notNull(),
  updatedAt: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP`)
});

export const challengeEntries = pgTable('challenge_entries', {
  id: serial('id').primaryKey(),
  challengeId: integer('challenge_id').notNull(),
  telegramId: text('telegram_id').notNull(),
  betLink: text('bet_link').notNull(),
  status: text('status').default('pending'),
  bonusCode: text('bonus_code'),
  submittedAt: timestamp('submitted_at').default(sql`CURRENT_TIMESTAMP`),
  verifiedAt: timestamp('verified_at'),
  verifiedBy: text('verified_by'),
  updatedAt: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP`)
});

// Define relations
export const telegramUserRelations = relations(telegramUsers, ({ one }) => ({
  platformUser: one(users, {
    fields: [telegramUsers.platformUserId],
    references: [users.id],
  }),
}));