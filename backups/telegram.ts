import {
  pgTable,
  text,
  timestamp,
  boolean,
  serial,
  integer,
  json,
} from "drizzle-orm/pg-core";
import { sql, relations } from "drizzle-orm";
import { users } from "../schema";
import {
  createInsertSchema as createZodInsertSchema,
  createSelectSchema as createZodSelectSchema,
} from "drizzle-zod";

export const telegramUsers = pgTable("telegram_users", {
  telegramId: text("telegram_id").primaryKey(),
  telegramUsername: text("telegram_username"),
  goatedUsername: text("goated_username"),
  goatedUid: text("goated_uid"),
  isVerified: boolean("is_verified").default(false),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  lastActive: timestamp("last_active").default(sql`CURRENT_TIMESTAMP`),
  notificationsEnabled: boolean("notifications_enabled").default(true),
  verifiedAt: timestamp("verified_at"),
  verifiedBy: text("verified_by"),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
  // Link to platform user
  platformUserId: integer("platform_user_id").references(() => users.id),
});

export const verificationRequests = pgTable("verification_requests", {
  telegramId: text("telegram_id").primaryKey(),
  goatedUsername: text("goated_username").notNull(),
  requestedAt: timestamp("requested_at").default(sql`CURRENT_TIMESTAMP`),
  status: text("status").default("pending"),
  adminNotes: text("admin_notes"),
  telegramUsername: text("telegram_username"),
  verifiedAt: timestamp("verified_at"),
  verifiedBy: text("verified_by"),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const challenges = pgTable("challenges", {
  id: serial("id").primaryKey(),
  game: text("game").notNull(),
  multiplier: text("multiplier"),
  minBet: text("min_bet").notNull(),
  prizeAmount: text("prize_amount").notNull(),
  maxWinners: integer("max_winners").notNull(),
  timeframe: text("timeframe"),
  description: text("description"),
  status: text("status").default("active"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  createdBy: text("created_by").notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const challengeEntries = pgTable("challenge_entries", {
  id: serial("id").primaryKey(),
  challengeId: integer("challenge_id").notNull(),
  telegramId: text("telegram_id").notNull(),
  betLink: text("bet_link").notNull(),
  status: text("status").default("pending"),
  bonusCode: text("bonus_code"),
  submittedAt: timestamp("submitted_at").default(sql`CURRENT_TIMESTAMP`),
  verifiedAt: timestamp("verified_at"),
  verifiedBy: text("verified_by"),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// Bot state storage for persistence
export const telegramBotState = pgTable("telegram_bot_state", {
  id: text("id").primaryKey(),
  stateType: text("state_type").notNull(),
  data: json("data").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// Define relations
export const telegramUserRelations = relations(telegramUsers, ({ one }) => ({
  platformUser: one(users, {
    fields: [telegramUsers.platformUserId],
    references: [users.id],
  }),
}));

// Create zod schemas for validation
export const insertTelegramBotStateSchema =
  createZodInsertSchema(telegramBotState);
export const selectTelegramBotStateSchema =
  createZodSelectSchema(telegramBotState);
export const insertTelegramUserSchema = createZodInsertSchema(telegramUsers);
export const selectTelegramUserSchema = createZodSelectSchema(telegramUsers);
export const insertVerificationRequestSchema =
  createZodInsertSchema(verificationRequests);
export const selectVerificationRequestSchema =
  createZodSelectSchema(verificationRequests);
export const insertChallengeSchema = createZodInsertSchema(challenges);
export const selectChallengeSchema = createZodSelectSchema(challenges);
export const insertChallengeEntrySchema =
  createZodInsertSchema(challengeEntries);
export const selectChallengeEntrySchema =
  createZodSelectSchema(challengeEntries);

export type InsertTelegramBotState = typeof telegramBotState.$inferInsert;
export type SelectTelegramBotState = typeof telegramBotState.$inferSelect;
export type InsertTelegramUser = typeof telegramUsers.$inferInsert;
export type SelectTelegramUser = typeof telegramUsers.$inferSelect;
export type InsertVerificationRequest =
  typeof verificationRequests.$inferInsert;
export type SelectVerificationRequest =
  typeof verificationRequests.$inferSelect;
export type InsertChallenge = typeof challenges.$inferInsert;
export type SelectChallenge = typeof challenges.$inferSelect;
export type InsertChallengeEntry = typeof challengeEntries.$inferInsert;
export type SelectChallengeEntry = typeof challengeEntries.$inferSelect;
