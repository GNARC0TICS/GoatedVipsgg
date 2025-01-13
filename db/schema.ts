import { pgTable, text, serial, integer, timestamp, boolean, decimal, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
  email: text("email").unique().notNull(),
  isAdmin: boolean("is_admin").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const wagerRaces = pgTable("wager_races", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  type: text("type").notNull(), // 'weekly' | 'monthly' | 'weekend'
  status: text("status").notNull(), // 'upcoming' | 'live' | 'completed'
  prizePool: decimal("prize_pool", { precision: 18, scale: 2 }).notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  minWager: decimal("min_wager", { precision: 18, scale: 2 }).notNull(),
  prizeDistribution: jsonb("prize_distribution").notNull(), // { "1": 25, "2": 15, ... }
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const wagerRaceParticipants = pgTable("wager_race_participants", {
  id: serial("id").primaryKey(),
  raceId: integer("race_id").references(() => wagerRaces.id),
  userId: integer("user_id").references(() => users.id),
  totalWager: decimal("total_wager", { precision: 18, scale: 2 }).notNull(),
  rank: integer("rank"),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const notificationPreferences = pgTable("notification_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  wagerRaceUpdates: boolean("wager_race_updates").default(true).notNull(),
  vipStatusChanges: boolean("vip_status_changes").default(true).notNull(),
  promotionalOffers: boolean("promotional_offers").default(true).notNull(),
  monthlyStatements: boolean("monthly_statements").default(true).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const affiliateStats = pgTable("affiliate_stats", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  totalWager: decimal("total_wager", { precision: 18, scale: 8 }).notNull(),
  commission: decimal("commission", { precision: 18, scale: 8 }).notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const userRelations = relations(users, ({ one, many }) => ({
  preferences: one(notificationPreferences, {
    fields: [users.id],
    references: [notificationPreferences.userId],
  }),
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

export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export const insertNotificationPreferencesSchema = createInsertSchema(notificationPreferences);
export const selectNotificationPreferencesSchema = createSelectSchema(notificationPreferences);
export const insertWagerRaceSchema = createInsertSchema(wagerRaces);
export const selectWagerRaceSchema = createSelectSchema(wagerRaces);
export const insertWagerRaceParticipantSchema = createInsertSchema(wagerRaceParticipants);
export const selectWagerRaceParticipantSchema = createSelectSchema(wagerRaceParticipants);

export type InsertUser = typeof users.$inferInsert;
export type SelectUser = typeof users.$inferSelect;
export type InsertNotificationPreferences = typeof notificationPreferences.$inferInsert;
export type SelectNotificationPreferences = typeof notificationPreferences.$inferSelect;
export type InsertWagerRace = typeof wagerRaces.$inferInsert;
export type SelectWagerRace = typeof wagerRaces.$inferSelect;
export type InsertWagerRaceParticipant = typeof wagerRaceParticipants.$inferInsert;
export type SelectWagerRaceParticipant = typeof wagerRaceParticipants.$inferSelect;