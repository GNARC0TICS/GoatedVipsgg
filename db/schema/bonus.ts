import { pgTable, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users";

export const bonusCodes = pgTable('bonus_codes', {
  id: integer('id').primaryKey(),
  code: text('code').notNull().unique(),
  amount: integer('amount').notNull(),
  requiredWager: integer('required_wager').notNull(),
  totalClaims: integer('total_claims').notNull(),
  currentClaims: integer('current_claims').default(0),
  createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
  expiresAt: timestamp('expires_at'),
  isActive: boolean('is_active').default(true),
  createdBy: integer('created_by').references(() => users.id),
});

export const bonusCodeClaims = pgTable('bonus_code_claims', {
  id: integer('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  bonusCodeId: integer('bonus_code_id').notNull().references(() => bonusCodes.id),
  claimedAt: timestamp('claimed_at').default(sql`CURRENT_TIMESTAMP`),
  wagerCompleted: boolean('wager_completed').default(false),
  completedAt: timestamp('completed_at'),
});
