import { pgTable, text, timestamp, boolean, serial, integer } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "@db/schema";
import { relations } from "drizzle-orm";

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
  userId: text('user_id').notNull(),
  betLink: text('bet_link').notNull(),
  status: text('status').default('pending'),
  bonusCode: text('bonus_code'),
  submittedAt: timestamp('submitted_at').default(sql`CURRENT_TIMESTAMP`),
  verifiedAt: timestamp('verified_at'),
  verifiedBy: text('verified_by'),
  updatedAt: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP`)
});

export const bonusCodes = pgTable('bonus_codes', {
  id: serial('id').primaryKey(),
  code: text('code').notNull(),
  userId: text('user_id').notNull(),
  claimedAt: timestamp('claimed_at'),
  expiresAt: timestamp('expires_at').notNull(),
  status: text('status').default('active'),
  type: text('type').default('challenge'),
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
  user: one(users, {
    fields: [bonusCodes.userId],
    references: [users.id],
  }),
}));
