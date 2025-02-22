import {
  pgTable,
  text,
  serial,
  timestamp,
  boolean,
  decimal,
  jsonb,
  integer,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { telegramUsers, telegramUserRelations, type InsertTelegramUser, type SelectTelegramUser } from "./schema/telegram";
import { verificationRequests, verificationRequestRelations, type InsertVerificationRequest, type SelectVerificationRequest } from "./schema/verification";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  isAdmin: boolean("is_admin").default(false).notNull(),
  telegramId: text("telegram_id").unique(),
  telegramVerified: boolean("telegram_verified").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  emailVerified: boolean("email_verified").default(false),
});

// Define relations
export const userRelations = relations(users, ({ one }) => ({
  telegramUser: one(telegramUsers, {
    fields: [users.telegramId],
    references: [telegramUsers.telegramId],
  }),
}));

// Export schemas for validation
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);

// Export types
export type InsertUser = typeof users.$inferInsert;
export type SelectUser = typeof users.$inferSelect;

// Re-export everything from schema modules
export * from "./schema/users";
export * from "./schema/telegram";
export * from "./schema/verification";
export * from "./schema/challenges";

// Additional tables that don't fit into other modules
export const historicalRaces = pgTable("historical_races", {
  id: serial("id").primaryKey(),
  month: text("month").notNull(),
  year: text("year").notNull(),
  prizePool: decimal("prize_pool", { precision: 10, scale: 2 }).notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  participants: jsonb("participants").notNull(),
  totalWagered: decimal("total_wagered", { precision: 18, scale: 2 }).notNull(),
  participantCount: text("participant_count").notNull(),
  status: text("status").notNull().default("completed"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  metadata: jsonb("metadata").default({}).notNull(),
});

export const newsletterSubscriptions = pgTable("newsletter_subscriptions", {
  id: serial("id").primaryKey(),
  email: text("email").unique().notNull(),
  isSubscribed: boolean("is_subscribed").default(true).notNull(),
  subscribedAt: timestamp("subscribed_at").defaultNow().notNull(),
  unsubscribedAt: timestamp("unsubscribed_at"),
  source: text("source"),
});

export const notificationPreferences = pgTable("notification_preferences", {
  id: serial("id").primaryKey(),
  wagerRaceUpdates: boolean("wager_race_updates").default(true).notNull(),
  vipStatusChanges: boolean("vip_status_changes").default(true).notNull(),
  promotionalOffers: boolean("promotional_offers").default(true).notNull(),
  monthlyStatements: boolean("monthly_statements").default(true).notNull(),
  emailNotifications: boolean("email_notifications").default(true).notNull(),
  pushNotifications: boolean("push_notifications").default(true).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const affiliateStats = pgTable("affiliate_stats", {
  id: serial("id").primaryKey(),
  totalWager: decimal("total_wager", { precision: 18, scale: 8 }).notNull(),
  commission: decimal("commission", { precision: 18, scale: 8 }).notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const mockWagerData = pgTable("mock_wager_data", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  username: text("username").notNull(),
  wageredToday: decimal("wagered_today", { precision: 18, scale: 8 })
    .default("0")
    .notNull(),
  wageredThisWeek: decimal("wagered_this_week", { precision: 18, scale: 8 })
    .default("0")
    .notNull(),
  wageredThisMonth: decimal("wagered_this_month", { precision: 18, scale: 8 })
    .default("0")
    .notNull(),
  wageredAllTime: decimal("wagered_all_time", { precision: 18, scale: 8 })
    .default("0")
    .notNull(),
  isMocked: boolean("is_mocked").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: integer("created_by").references(() => users.id),
});

export const mockWagerDataRelations = relations(mockWagerData, ({ one }) => ({
  user: one(users, {
    fields: [mockWagerData.userId],
    references: [users.id],
  }),
  creator: one(users, {
    fields: [mockWagerData.createdBy],
    references: [users.id],
  }),
}));

export const transformationLogs = pgTable("transformation_logs", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  message: text("message").notNull(),
  payload: jsonb("payload"),
  duration_ms: decimal("duration_ms", { precision: 10, scale: 2 }),
  created_at: timestamp("created_at").defaultNow().notNull(),
  resolved: boolean("resolved").default(false).notNull(),
  error_message: text("error_message"),
});

// Create schemas for validation
export const insertHistoricalRaceSchema = createInsertSchema(historicalRaces);
export const selectHistoricalRaceSchema = createSelectSchema(historicalRaces);
export const insertNewsletterSubscriptionSchema = createInsertSchema(newsletterSubscriptions);
export const selectNewsletterSubscriptionSchema = createSelectSchema(newsletterSubscriptions);
export const insertAffiliateStatsSchema = createInsertSchema(affiliateStats);
export const selectAffiliateStatsSchema = createSelectSchema(affiliateStats);
export const insertMockWagerDataSchema = createInsertSchema(mockWagerData);
export const selectMockWagerDataSchema = createSelectSchema(mockWagerData);
export const insertTransformationLogSchema = createInsertSchema(transformationLogs);
export const selectTransformationLogSchema = createSelectSchema(transformationLogs);

// Export types for the additional tables
export type InsertHistoricalRace = typeof historicalRaces.$inferInsert;
export type SelectHistoricalRace = typeof historicalRaces.$inferSelect;
export type InsertNewsletterSubscription = typeof newsletterSubscriptions.$inferInsert;
export type SelectNewsletterSubscription = typeof newsletterSubscriptions.$inferSelect;
export type InsertAffiliateStats = typeof affiliateStats.$inferInsert;
export type SelectAffiliateStats = typeof affiliateStats.$inferSelect;
export type InsertMockWagerData = typeof mockWagerData.$inferInsert;
export type SelectMockWagerData = typeof mockWagerData.$inferSelect;
export type InsertTransformationLog = typeof transformationLogs.$inferInsert;
export type SelectTransformationLog = typeof transformationLogs.$inferSelect;