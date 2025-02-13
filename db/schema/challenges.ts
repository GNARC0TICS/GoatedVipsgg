import { pgTable, text, timestamp, boolean, serial, integer } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "@db/schema";
import { relations } from "drizzle-orm";

export const bonusCodes = pgTable('bonus_codes', {
  id: serial('id').primaryKey(),
  code: text('code').notNull(),
  description: text('description'),
  bonusAmount: text('bonus_amount').notNull(),
  requiredWager: text('required_wager'),
  totalClaims: integer('total_claims'),
  currentClaims: integer('current_claims').default(0),
  expiresAt: timestamp('expires_at').notNull(),
  status: text('status').default('active'),
  source: text('source').default('web'), // 'web' or 'telegram'
  createdBy: text('created_by').notNull(),
  createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP`)
});

export const challenges = pgTable('challenges', {
  id: serial('id').primaryKey(),
  game: text('game').notNull(),
  minBet: text('min_bet').notNull(),
  multiplier: text('multiplier'),
  prizeAmount: text('prize_amount').notNull(),
  maxWinners: integer('max_winners').notNull(),
  timeframe: timestamp('timeframe').notNull(),
  description: text('description'),
  status: text('status').default('active'),
  createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
  createdBy: text('created_by').notNull(),
  bonusCode: text('bonus_code'),
  source: text('source').default('web'), // 'web' or 'telegram'
  updatedAt: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP`)
});

export const challengeEntries = pgTable('challenge_entries', {
  id: serial('id').primaryKey(),
  challengeId: integer('challenge_id').notNull().references(() => challenges.id),
  userId: text('user_id').notNull().references(() => users.id),
  betLink: text('bet_link').notNull(),
  status: text('status').default('pending'),
  bonusCode: text('bonus_code'),
  submittedAt: timestamp('submitted_at').default(sql`CURRENT_TIMESTAMP`),
  verifiedAt: timestamp('verified_at'),
  verifiedBy: text('verified_by'),
  updatedAt: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP`)
});

// Define relations
export const challengeRelations = relations(challenges, ({ many }) => ({
  entries: many(challengeEntries),
}));

export const challengeEntriesRelations = relations(challengeEntries, ({ one }) => ({
  challenge: one(challenges, {
    fields: [challengeEntries.challengeId],
    references: [challenges.id],
  }),
  user: one(users, {
    fields: [challengeEntries.userId],
    references: [users.id],
  }),
}));

export const bonusCodeRelations = relations(bonusCodes, ({ one }) => ({
  creator: one(users, {
    fields: [bonusCodes.createdBy],
    references: [users.id],
  }),
}));

export type Challenge = typeof challenges.$inferSelect;
export type ChallengeEntry = typeof challengeEntries.$inferSelect;
export type BonusCode = typeof bonusCodes.$inferSelect;