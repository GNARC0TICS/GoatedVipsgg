import {
  pgTable,
  text,
  serial,
  integer,
  timestamp,
  boolean,
  decimal,
  jsonb,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { challenges, challengeEntries, telegramUsers, verificationRequests, verificationHistory } from './schema/telegram';
import { historicalRaces } from './schema/races';

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
  email: text("email").unique().notNull(),
  isAdmin: boolean("is_admin").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastLoginIp: text("last_login_ip"),
  registrationIp: text("registration_ip"),
  ipHistory: jsonb("ip_history"),
  loginHistory: jsonb("login_history"),
  emailVerified: boolean("email_verified"),
  emailVerificationToken: text("email_verification_token"),
  country: text("country"),
  city: text("city"),
  lastActive: timestamp("last_active"),
  telegramId: text("telegram_id"),
  telegramVerified: boolean("telegram_verified"),
  telegramVerifiedAt: timestamp("telegram_verified_at"),
  goatedUsername: text("goated_username"),
  goatedVerified: boolean("goated_verified")
});

export const wagerRaces = pgTable("wager_races", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  type: text("type").notNull(),
  status: text("status").notNull(),
  prizePool: decimal("prize_pool", { precision: 18, scale: 2 }).notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  minWager: decimal("min_wager", { precision: 18, scale: 2 }).notNull(),
  prizeDistribution: jsonb("prize_distribution").notNull(),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  rules: text("rules"),
  description: text("description").default(''),
});

export const wagerRaceParticipants = pgTable("wager_race_participants", {
  id: serial("id").primaryKey(),
  raceId: integer("race_id").references(() => wagerRaces.id),
  userId: integer("user_id").references(() => users.id),
  totalWager: decimal("total_wager", { precision: 18, scale: 2 }).notNull(),
  rank: integer("rank"),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  wagerHistory: jsonb("wager_history").default([]),
});

export const notificationPreferences = pgTable("notification_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
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
  userId: integer("user_id").references(() => users.id),
  totalWager: decimal("total_wager", { precision: 18, scale: 8 }).notNull(),
  commission: decimal("commission", { precision: 18, scale: 8 }).notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const bonusCodes = pgTable("bonus_codes", {
  id: serial("id").primaryKey(),
  code: text("code").unique().notNull(),
  description: text("description").default('').notNull(),
  value: text("value").default('0').notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expired: boolean("expired").default(false).notNull(),
  createdBy: integer("created_by").references(() => users.id),
  userId: integer("user_id").references(() => users.id),
  claimedAt: timestamp("claimed_at"),
});

export const sessions = pgTable("session", {
  id: text("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// Relations setup
export const userRelations = relations(users, ({ one, many }) => ({
  preferences: one(notificationPreferences, {
    fields: [users.id],
    references: [notificationPreferences.userId],
  }),
  telegramUser: one(telegramUsers, {
    fields: [users.id],
    references: [telegramUsers.userId],
  }),
  verificationRequest: one(verificationRequests, {
    fields: [users.id],
    references: [verificationRequests.userId],
  }),
  verificationHistory: many(verificationHistory),
  createdRaces: many(wagerRaces),
  raceParticipations: many(wagerRaceParticipants),
}));

export const wagerRaceRelations = relations(wagerRaces, ({ one, many }) => ({
  creator: one(users, {
    fields: [wagerRaces.createdBy],
    references: [users.id],
  }),
  participants: many(wagerRaceParticipants),
}));

// Schema validation
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export const insertNotificationPreferencesSchema = createInsertSchema(notificationPreferences);
export const selectNotificationPreferencesSchema = createSelectSchema(notificationPreferences);
export const insertWagerRaceSchema = createInsertSchema(wagerRaces);
export const selectWagerRaceSchema = createSelectSchema(wagerRaces);
export const insertWagerRaceParticipantSchema = createInsertSchema(wagerRaceParticipants);
export const selectWagerRaceParticipantSchema = createSelectSchema(wagerRaceParticipants);

// Types
export type InsertUser = typeof users.$inferInsert;
export type SelectUser = typeof users.$inferSelect;
export type InsertNotificationPreferences = typeof notificationPreferences.$inferInsert;
export type SelectNotificationPreferences = typeof notificationPreferences.$inferSelect;
export type InsertWagerRace = typeof wagerRaces.$inferInsert;
export type SelectWagerRace = typeof wagerRaces.$inferSelect;
export type InsertWagerRaceParticipant = typeof wagerRaceParticipants.$inferInsert;
export type SelectWagerRaceParticipant = typeof wagerRaceParticipants.$inferSelect;

export { 
  telegramUsers, 
  verificationRequests, 
  verificationHistory, 
  challenges, 
  challengeEntries,
  historicalRaces 
};